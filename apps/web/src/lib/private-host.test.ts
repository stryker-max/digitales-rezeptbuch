import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { privateHost, privateOrigin } from "./private-host.ts";
import { serverEncryption } from "./server-encryption.ts";

test("private server sessions are signed, expire, and cannot be reused on another host", () => {
  const secret = randomBytes(32).toString("base64url"), now = 1793090000000;
  const host = privateHost(secret, "https://recipe.example"), session = host.issue(now);
  assert.equal(host.verify(session, now), true);
  assert.equal(host.verify(session, now + 31 * 86400000), false);
  assert.equal(host.verify(`${session.slice(0, -1)}!`, now), false);
  assert.equal(privateHost(secret, "https://other.example").verify(session, now), false);
  assert.equal(host.passwordMatches("a long synthetic password", "a long synthetic password"), true);
  assert.equal(host.passwordMatches("wrong", "a long synthetic password"), false);
  assert.throws(() => privateOrigin("http://recipe.example"));
  assert.throws(() => privateOrigin("https://recipe.example/path"));
});
test("server credential encryption needs its key and rejects ciphertext manipulation", async () => {
  const provider = serverEncryption(randomBytes(32).toString("base64url"));
  const sample = "synthetic-server-credentials-only";
  const encrypted = Buffer.from(await provider.encrypt(sample));
  assert.equal(encrypted.includes(Buffer.from(sample)), false);
  assert.equal(await provider.decrypt(encrypted), sample);
  encrypted[encrypted.length - 1] ^= 1;
  await assert.rejects(async () => provider.decrypt(encrypted));
  assert.throws(() => serverEncryption("missing-or-short-key"));
});
