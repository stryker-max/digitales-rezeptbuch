import test from "node:test";
import assert from "node:assert/strict";
import { saveSetup, loadSetup, forgetSetup, setupStorageKey } from "./setup-access.ts";
test("one-time setup permission survives a reload in its tab and can be cleared", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const capability = "S".repeat(43);
  saveSetup(storage, capability); assert.equal(loadSetup(storage), capability);
  forgetSetup(storage); assert.equal(loadSetup(storage), "");
  values.set(setupStorageKey, "not-a-permission"); assert.equal(loadSetup(storage), ""); assert.equal(values.size, 0);
  saveSetup(storage, "invalid"); assert.equal(values.size, 0);
});
test("unavailable tab storage never prevents in-memory setup", () => {
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
  assert.doesNotThrow(() => saveSetup(blocked, "S".repeat(43))); assert.equal(loadSetup(blocked), ""); assert.doesNotThrow(() => forgetSetup(blocked));
});
