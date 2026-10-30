import test from "node:test";
import assert from "node:assert/strict";
import { emptyHousehold, mergeHousehold, parseHousehold } from "./household.ts";
test("shared plan and shopping merge separate concurrent edits without losing purchases or manual items", () => {
  const base = emptyHousehold(); base.purchased["Karotte|g"] = 100;
  const mine = structuredClone(base), theirs = structuredClone(base);
  mine.plan[0] = { recipeId: "suppe", servings: 2 }; mine.manualItems.push({ id: "a", text: "Milch", done: false });
  theirs.plan[1] = { recipeId: "pasta", servings: 4 }; theirs.purchased["Karotte|g"] = 250; theirs.manualItems.push({ id: "b", text: "Brot", done: true });
  const result = mergeHousehold(base, mine, theirs);
  assert.deepEqual(result.conflicts, []); assert.equal(result.state.plan[0]?.recipeId, "suppe"); assert.equal(result.state.plan[1]?.recipeId, "pasta"); assert.equal(result.state.purchased["Karotte|g"], 250); assert.equal(result.state.manualItems.length, 2);
});
test("concurrent edits to the same plan or purchase require a choice", () => {
  const base = emptyHousehold(), mine = emptyHousehold(), theirs = emptyHousehold();
  mine.plan[0] = { recipeId: "a", servings: 2 }; theirs.plan[0] = { recipeId: "b", servings: 2 };
  mine.purchased["x|g"] = 10; theirs.purchased["x|g"] = 20;
  assert.equal(mergeHousehold(base, mine, theirs).conflicts.length, 2);
  assert.equal(parseHousehold({ ...mine, plan: [] }), null);
  assert.equal(parseHousehold(JSON.parse('{"plan":[null,null,null,null,null,null,null],"adopted":false,"purchased":{"__proto__":0},"manualItems":[]}')), null);
});
