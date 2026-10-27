import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { PoolClient } from "pg";
import { ChatGPTError, validateStoredState, type ChatGPTProfileStore, type StoredState } from "@rezeptbuch/chatgpt-local";
import { postgresPool } from "./postgres-store.ts";
import { serverEncryption } from "./server-encryption.ts";

export class PostgresProfiles implements ChatGPTProfileStore {
  readonly context = new AsyncLocalStorage<PoolClient>();
  readonly encryption;
  constructor(key: string) { this.encryption = serverEncryption(key); }
  async withLock<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const client = await (await postgresPool()).connect();
    let locked = false;
    try {
      const started = Date.now();
      do {
        signal?.throwIfAborted();
        locked = (await client.query("SELECT pg_try_advisory_lock(194729,2) AS locked")).rows[0].locked;
        if (locked) break;
        if (Date.now() - started > 45000) throw new ChatGPTError("storage_busy", "Abo-Verbindung wird gerade aktualisiert.", true);
        await delay(100, undefined, { signal });
      } while (!locked);
      // Intentionally NO enclosing transaction: the OAuth rotation checkpoint
      // must stay committed even when subsequent identity verification fails.
      return await this.context.run(client, operation);
    } catch (error) {
      if (error instanceof ChatGPTError) throw error;
      throw new ChatGPTError("storage_error", "Geschützter Abo-Speicher ist nicht erreichbar. Vorhandene Anmeldung bleibt erhalten.", true);
    } finally {
      let broken = !locked;
      if (locked) {
        try { await client.query("SELECT pg_advisory_unlock(194729,2)"); }
        catch { broken = true; }
      }
      client.release(broken);
    }
  }

  private client() { const client = this.context.getStore(); if (!client) throw new ChatGPTError("storage_lock_lost", "Abo-Speicher nur unter exklusiver Sperre verwenden."); return client; }
  async getHostId() {
    const client = this.client();
    await client.query("INSERT INTO rb_chatgpt(id,host_id,updated_at) VALUES(1,$1,$2) ON CONFLICT DO NOTHING", [randomUUID(), new Date().toISOString()]);
    return (await client.query("SELECT host_id FROM rb_chatgpt WHERE id=1")).rows[0].host_id as string;
  }
  async read(): Promise<StoredState | undefined> {
    const row = (await this.client().query("SELECT encrypted_state,provider FROM rb_chatgpt WHERE id=1")).rows[0];
    if (!row?.encrypted_state) return undefined;
    if (row.provider !== this.encryption.id) throw new ChatGPTError("storage_provider_mismatch", "Verschlüsselungsverfahren stimmt nicht überein. Anmeldung bleibt erhalten.");
    try { return validateStoredState(JSON.parse(await this.encryption.decrypt(row.encrypted_state))); }
    catch { throw new ChatGPTError("storage_decryption_failed", "Abo-Anmeldung konnte nicht entschlüsselt werden. Gespeicherte Anmeldung bleibt erhalten."); }
  }
  async write(state: StoredState) {
    const plaintext = JSON.stringify(validateStoredState(state));
    if (Buffer.byteLength(plaintext) > 2 * 1024 * 1024) throw new ChatGPTError("storage_invalid", "Abo-Speicher zu groß.");
    await this.getHostId();
    await this.client().query("UPDATE rb_chatgpt SET encrypted_state=$1,provider=$2,updated_at=$3 WHERE id=1", [Buffer.from(await this.encryption.encrypt(plaintext)), this.encryption.id, new Date().toISOString()]);
  }
}
export async function importPostgresBootstrap(key: string, encrypted?: string) {
  const store = new PostgresProfiles(key);
  await store.withLock(async () => {
    await store.getHostId();
    if (await store.read() || !encrypted) return;
    if (!/^[A-Za-z0-9_-]+$/.test(encrypted) || encrypted.length > 3000000) throw new Error("Ungültiges Serverpaket.");
    const payload = JSON.parse(await store.encryption.decrypt(Buffer.from(encrypted, "base64url")));
    const state = validateStoredState(payload.state);
    if (payload.kind !== "recipe-server-bootstrap-v1" || state.profiles.length !== 1 || state.profiles[0].id !== state.activeProfileId) throw new Error("Ungültige ausgewählte Abo-Verbindung.");
    await store.write(state);
  });
}
