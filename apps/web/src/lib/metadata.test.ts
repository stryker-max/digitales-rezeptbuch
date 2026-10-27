import test from "node:test";
import assert from "node:assert/strict";
import { calculateNutrition, parseCatalog, suggestTags } from "./metadata.ts";
import { recipes } from "./seed.ts";
import { parsePreferences } from "./local-preferences.ts";

const catalog = parseCatalog({ version: 1, foods: [{ id: "synthetic-1", name: "Künstliches Testlebensmittel", state: "roh", source: "Synthetischer Rechentest, keine Ernährungsdaten", version: "1", license: "Testdaten", per100g: { kcal: 100, protein: 10, carbs: 20, fat: null } }] });
test("nutrition sums grams deterministically and keeps per-nutrient unknowns", () => {
  const recipe = { ...recipes[0], ingredients: [{ ...recipes[0].ingredients[0], quantity: 250, unit: "g" }] };
  const result = calculateNutrition(recipe, catalog, { [recipe.ingredients[0].id]: "synthetic-1" });
  assert.equal(result.totals.kcal.subtotal, 250);
  assert.equal(result.totals.protein.subtotal, 25);
  assert.equal(result.totals.kcal.missing.length, 0);
  assert.equal(result.totals.fat.missing.length, 1);
  const volume = calculateNutrition({ ...recipe, ingredients: [{ ...recipe.ingredients[0], unit: "ml" }] }, catalog, { [recipe.ingredients[0].id]: "synthetic-1" });
  assert.equal(volume.totals.kcal.missing.length, 1);
  assert.equal(volume.contributions[0].grams, null);
});
test("tags allow meat and vegetables together without inferring dietary safety", () => {
  const tags = suggestTags(recipes[2]).map((item) => item.tag);
  assert.ok(tags.includes("Fleisch")); assert.ok(tags.includes("Gemüse"));
  assert.ok(!tags.includes("vegetarisch")); assert.ok(!tags.includes("glutenfrei"));
});
test("catalog rejects missing provenance and impossible values", () => {
  assert.throws(() => parseCatalog({ version: 1, foods: [{ ...catalog.foods[0], source: "" }] }));
  assert.throws(() => parseCatalog({ version: 1, foods: [{ ...catalog.foods[0], per100g: { ...catalog.foods[0].per100g, kcal: -1 } }] }));
});
test("legacy purchased kilograms are migrated without losing purchases", () => {
  const value = parsePreferences(JSON.stringify({ plan: Array(7).fill(null), adopted: true, purchased: { "karotte|kg": 0.5, "karotte|g": 20 }, checks: {}, favorites: [] }));
  assert.equal(value?.purchased["karotte|g"], 520);
});
