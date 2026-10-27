import { ConnectionStore } from "../packages/chatgpt-local/dist/storage.js";
import { serverEncryption } from "../apps/web/src/lib/server-encryption.ts";

export async function importServerBootstrap(directory, key, encrypted) {
  const encryption = serverEncryption(key), store = new ConnectionStore(directory, encryption);
  await store.withLock(async () => {
    // Preserve a server's existing credential session and its own host ID.
    await store.getHostId();
    if (await store.read()) return;
    if (!encrypted) return;
    if (!/^[A-Za-z0-9_-]+$/.test(encrypted) || encrypted.length > 3_000_000) throw new Error("Ungültiges geschütztes Serverpaket.");
    const payload = JSON.parse(await encryption.decrypt(Buffer.from(encrypted, "base64url")));
    if (payload.kind !== "recipe-server-bootstrap-v1" || payload.state?.profiles?.length !== 1 || payload.state.profiles[0].id !== payload.state.activeProfileId) throw new Error("Ungültige ausgewählte Abo-Verbindung.");
    await store.write(payload.state);
  });
}
