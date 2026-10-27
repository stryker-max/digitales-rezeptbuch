import test from "node:test";
import assert from "node:assert/strict";
import { createArchive, readArchive, readFullArchive, sameRecipeContent } from "./local-archive.ts";
import { parsePreferences } from "./local-preferences.ts";
import { sha256, type LocalRecipe } from "./local-store.ts";

async function exampleRecipe(): Promise<LocalRecipe> {
  const sourceBlob = new Blob(["Synthetische Rezeptvorlage für den Archivtest."], { type: "image/png" });
  return {
    id: "d186ffda-ec11-4555-a3db-28681058b468",
    title: "Test-Apfelpfanne",
    description: "Künstliches Testrezept.",
    tags: ["Dessert"],
    estimatedMinutes: null,
    servings: 2,
    imagePosition: undefined,
    ingredients: [{ id: "apfel-stueck", name: "Apfel", amountText: "1 Stück", quantity: 1, unit: "Stück", group: "Obst" }],
    equipment: [{ name: "Pfanne", origin: "source" }],
    steps: [{ title: "Schritt 1", instruction: "Apfel in die Pfanne geben.", relatedIngredients: ["Apfel"] }],
    sourceText: "1 Apfel. In die Pfanne geben.",
    demo: false,
    sourceName: "synthetisch.png",
    sourceType: "image/png",
    sourceHash: await sha256(sourceBlob),
    sourceBlob,
    createdAt: "2026-10-26T12:00:00.000Z",
  };
}

test("archive roundtrip preserves the original bytes and the confirmed text", async () => {
  const recipe = await exampleRecipe();
  const archive = await createArchive([recipe]);
  const restored = await readArchive(new File([archive], "sicherung.json", { type: "application/json" }));
  assert.equal(restored.length, 1);
  assert.equal(restored[0].sourceText, recipe.sourceText);
  assert.deepEqual(restored[0].ingredients, recipe.ingredients);
  assert.deepEqual(restored[0].steps, recipe.steps);
  assert.equal(restored[0].sourceHash, recipe.sourceHash);
  assert.deepEqual(Buffer.from(await restored[0].sourceBlob.arrayBuffer()), Buffer.from(await recipe.sourceBlob.arrayBuffer()));
});

test("archive rejects an altered original", async () => {
  const recipe = await exampleRecipe();
  const archive = await createArchive([recipe]);
  const payload = JSON.parse(await archive.text());
  payload.recipes[0].sourceBase64 = btoa("manipulated");
  await assert.rejects(
    readArchive(new File([JSON.stringify(payload)], "sicherung.json", { type: "application/json" })),
    /Prüfsumme/,
  );
});

test("archive refuses to export an original whose bytes no longer match its recorded hash", async () => {
  const recipe = await exampleRecipe();
  recipe.sourceBlob = new Blob(["Changed"], { type: "image/png" });
  await assert.rejects(createArchive([recipe]), /Prüfsumme/);
});

test("v2 backup restores plan, purchases, custom rows, metadata and provenance; v1 remains readable", async () => {
  const recipe = await exampleRecipe();
  recipe.analysis = { model: "synthetic", promptVersion: "test", blocks: [{ id: "b1", page: 1, text: recipe.sourceText }], issues: [], resolutions: {}, originalTranscription: recipe.sourceText };
  const preferences = parsePreferences(JSON.stringify({ plan: [{ recipeId: recipe.id, servings: 2 }, ...Array(6).fill(null)], adopted: true, purchased: { "apfel|Stück": 1 }, favorites: [recipe.id], checks: {}, metadata: { [recipe.id]: { tags: ["Eigene Korrektur"] } }, manualItems: [{ id: "m1", text: "Künstliche Testposition", done: true }] }))!;
  const archive = await createArchive([recipe], preferences);
  const restored = await readFullArchive(new File([archive], "v2.json"));
  assert.deepEqual(restored.preferences, preferences);
  assert.deepEqual(restored.recipes[0].analysis, recipe.analysis);
  const old = JSON.parse(await archive.text()); old.version = 1; delete old.preferences;
  assert.equal((await readArchive(new File([JSON.stringify(old)], "v1.json"))).length, 1);
  assert.equal(sameRecipeContent(recipe, { ...recipe, ingredients: [{ ...recipe.ingredients[0], quantity: 7 }] }), false);
});
