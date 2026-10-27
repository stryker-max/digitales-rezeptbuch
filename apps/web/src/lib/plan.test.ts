import test from "node:test";
import assert from "node:assert/strict";
import { recipes } from "./seed.ts";
import { baseUnit, parseQuantity, remaining, shoppingForPlan, suggestPlan } from "./plan.ts";
import type { PlanSlot, Recipe } from "./types.ts";

test("a manually assembled plan combines shared ingredients and scales only quantities", () => {
  const plan: PlanSlot[] = [
    { recipeId: "kuerbissuppe", servings: 4 },
    { recipeId: "rigatoni", servings: 4 },
  ];
  const list = shoppingForPlan(plan, recipes);
  assert.equal(list.find((item) => item.key === "zwiebel|Stück")?.required, 3);
  assert.equal(list.find((item) => item.key === "rigatoni|g")?.required, 400);
  assert.deepEqual(list.find((item) => item.key === "zwiebel|Stück")?.days, [0, 1]);
  assert.equal(remaining(3, 2), 1);
});

test("suggestions fill only empty days", () => {
  const plan: PlanSlot[] = [{ recipeId: "apfelcrumble", servings: 6 }, null];
  const proposed = suggestPlan(plan, recipes);
  assert.deepEqual(proposed[0], plan[0]);
  assert.equal(proposed[1]?.recipeId, "rigatoni");
});

test("unknown quantities stay unknown", () => {
  const altered: Recipe[] = [{ ...recipes[0], ingredients: [{ ...recipes[0].ingredients[0], quantity: null }] }];
  const list = shoppingForPlan([{ recipeId: "kuerbissuppe", servings: 4 }], altered);
  assert.equal(list[0].required, null);
  assert.equal(remaining(null, 0), null);
});

test("compatible units combine, masses and volumes stay apart, unknown servings use recipe multiples", () => {
  const recipe: Recipe = { ...recipes[0], servings: null, ingredients: [
    { ...recipes[0].ingredients[0], name: "Test", quantity: .5, unit: "kg" },
    { ...recipes[0].ingredients[0], name: "Test", quantity: 300, unit: "g" },
    { ...recipes[0].ingredients[0], name: "Test", quantity: 250, unit: "ml" },
    { ...recipes[0].ingredients[0], name: "Test", quantity: 1, unit: "l" },
  ] };
  const items = shoppingForPlan([{ recipeId: recipe.id, servings: 1 }], [recipe]);
  assert.equal(items.find((item) => item.unit === "g")?.required, 800);
  assert.equal(items.find((item) => item.unit === "ml")?.required, 1250);
  assert.deepEqual(baseUnit("dag"), { unit: "g", factor: 10 });
  assert.equal(remaining(800, 500), 300);
  assert.equal(recipe.ingredients[0].unit, "kg");
});
test("fraction quantities preserve open ranges and words", () => {
  assert.equal(parseQuantity("1½"), 1.5); assert.equal(parseQuantity("1/8"), .125);
  assert.equal(parseQuantity("1 1/2"), 1.5); assert.equal(parseQuantity("1–2"), null);
  assert.equal(parseQuantity("etwas"), null); assert.equal(parseQuantity("1/0"), null);
});
