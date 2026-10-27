import test from "node:test";
import assert from "node:assert/strict";
import { parsePreferences } from "./local-preferences.ts";

const valid = {
  plan: [{ recipeId: "rigatoni", servings: 4 }, null, null, null, null, null, null],
  adopted: true,
  purchased: { "zwiebel|Stück": 2 },
  favorites: ["rigatoni"],
  checks: { "i-rigatoni-zwiebel": true },
};

test("saved plan and purchased amounts survive a roundtrip", () => {
  assert.deepEqual(parsePreferences(JSON.stringify(valid)), { ...valid, metadata: {}, catalog: { version: 1, foods: [] }, manualItems: [], cookSession: null });
});

test("invalid local preferences are ignored", () => {
  assert.equal(parsePreferences("{"), null);
  assert.equal(parsePreferences(JSON.stringify({ ...valid, plan: [{ recipeId: "rigatoni", servings: 0 }, null, null, null, null, null, null] })), null);
  assert.equal(parsePreferences(JSON.stringify({ ...valid, purchased: { "zwiebel|Stück": -1 } })), null);
});
