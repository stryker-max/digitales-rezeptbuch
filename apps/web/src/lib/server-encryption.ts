import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { CredentialEncryption } from "@rezeptbuch/chatgpt-local";

// The key belongs in the server's secret store, separately from the encrypted disk.
// Changing/removing it must never silently create an empty credential profile.
export function serverEncryption(encodedKey: string): CredentialEncryption {
  if (!(/^[A-Za-z0-9_-]{43}$/.test(encodedKey) || /^[A-Za-z0-9+/]{43}=$/.test(encodedKey)) || Buffer.from(encodedKey, "base64url").length !== 32) throw new Error("Ein eigener 256-Bit-Serverschlüssel ist erforderlich.");
  const key = Buffer.from(encodedKey, "base64url");
  const aad = Buffer.from("digitales-rezeptbuch-chatgpt-server-v1");
  return {
    id: "recipe-server-aes256gcm-v1", isAvailable: () => true,
    encrypt(plaintext) {
      const nonce = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, nonce);
      cipher.setAAD(aad);
      const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]);
    },
    decrypt(bytes) {
      const value = Buffer.from(bytes);
      if (value.length < 28 || value.length > 3_000_000) throw new Error("Ungültiger verschlüsselter Zugang.");
      const cipher = createDecipheriv("aes-256-gcm", key, value.subarray(0, 12));
      cipher.setAAD(aad); cipher.setAuthTag(value.subarray(12, 28));
      return Buffer.concat([cipher.update(value.subarray(28)), cipher.final()]).toString("utf8");
    },
  };
}
