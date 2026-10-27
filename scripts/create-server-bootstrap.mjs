// Run only during an explicitly authorized server handoff. The new server key is
// read from stdin, never arguments. Only encrypted ciphertext leaves stdout.
import { ConnectionStore } from "../packages/chatgpt-local/dist/storage.js";
import { windowsEncryption } from "../apps/web/src/lib/windows-encryption.ts";
import { serverEncryption } from "../apps/web/src/lib/server-encryption.ts";
import { resolve } from "node:path";
let input = "";
for await (const chunk of process.stdin) { input += chunk; if (input.length > 4096) throw new Error("Einrichtungseingabe zu groß."); }
const { serverKey } = JSON.parse(input);
const source = new ConnectionStore(resolve(import.meta.dirname, "../private/chatgpt-abo"), windowsEncryption);
const state = await source.withLock(async () => {
  const saved = await source.read();
  const profile = saved?.profiles.find(p => p.id === saved.activeProfileId);
  if (!profile?.credentials?.refreshToken || profile.status !== "connected" || !profile.scopes.includes("chatgpt.tokens.use.direct")) throw new Error("Keine freigegebene übertragbare App-Verbindung vorhanden.");
  return { version: 2, activeProfileId: profile.id, profiles: [profile], pendingRegistrations: [] };
});
const encrypted = await serverEncryption(serverKey).encrypt(JSON.stringify({ kind: "recipe-server-bootstrap-v1", state }));
process.stdout.write(Buffer.from(encrypted).toString("base64url"));
