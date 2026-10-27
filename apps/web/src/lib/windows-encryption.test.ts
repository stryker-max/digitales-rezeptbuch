import test from "node:test";
import assert from "node:assert/strict";
import { windowsEncryption } from "./windows-encryption.ts";
test("Windows credential encryption preserves synthetic data without plaintext and rejects tampering", { skip: process.platform !== "win32" }, async () => {
  const sample = "synthetic-credential-test-only";
  const encrypted = await windowsEncryption.encrypt(sample);
  assert.equal(Buffer.from(encrypted).includes(Buffer.from(sample)), false);
  assert.equal(await windowsEncryption.decrypt(encrypted), sample);
  const changed = Uint8Array.from(encrypted); changed[changed.length - 1] ^= 1;
  await assert.rejects(windowsEncryption.decrypt(changed));
});
