import test from "node:test";
import assert from "node:assert/strict";
import { draftFromAnalysis, validateAnalysis, validateReview, type AnalysisDraft } from "./analysis-contract.ts";

export const synthetic: AnalysisDraft = {
  status: "recipe", issues: [],
  blocks: [
    { id: "title", page: 1, text: "Synthetische Apfelpfanne · 2 Portionen" },
    { id: "apple", page: 1, text: "1 Stück Apfel" },
    { id: "butter", page: 1, text: "10 g Butter" },
    { id: "step", page: 1, text: "Apfel in Stücke schneiden. In der Pfanne kurz braten, falls nötig." },
    { id: "note", page: 1, text: "Auch mit Birne möglich." },
    { id: "footer", page: 1, text: "Künstliche Testquelle" },
  ],
  recipe: {
    title: "Synthetische Apfelpfanne", titleBlockIds: ["title"], servings: 2, servingsRaw: "2 Portionen", servingsBlockIds: ["title"],
    ingredients: [{ amount: "1", unit: "Stück", name: "Apfel", blockIds: ["apple"] }, { amount: "10", unit: "g", name: "Butter", blockIds: ["butter"] }],
    equipment: [{ text: "Pfanne", blockIds: ["step"] }], steps: [{ text: "Apfel in Stücke schneiden. In der Pfanne kurz braten, falls nötig.", blockIds: ["step"] }],
    notes: [{ text: "Auch mit Birne möglich.", blockIds: ["note"] }], excludedBlocks: [{ blockId: "footer", reason: "Kennzeichnung der synthetischen Testdatei" }],
  },
};
test("structured extraction fills the review without inventing quantities or dropping conditions/notes", () => {
  const result = validateAnalysis(synthetic, 1); const draft = draftFromAnalysis(result);
  assert.equal(draft.title, "Synthetische Apfelpfanne"); assert.equal(draft.servings, "2");
  assert.equal(draft.ingredients, "1 | Stück | Apfel\n10 | g | Butter");
  assert.match(draft.steps, /falls nötig/); assert.equal(draft.notes, "Auch mit Birne möglich."); assert.equal(draft.confirmed, false);
});
test("structured extraction rejects invented fields, missing blocks and misleading portion ranges", () => {
  const mutate = () => structuredClone(synthetic);
  const amount = mutate(); amount.recipe!.ingredients[0].amount = "5"; assert.throws(() => validateAnalysis(amount, 1), /belegt/);
  const missing = mutate(); missing.recipe!.notes = []; assert.throws(() => validateAnalysis(missing, 1), /nicht zugeordnet/);
  const nullRef = mutate(); nullRef.recipe!.notes = []; nullRef.recipe!.servings = null; nullRef.recipe!.servingsRaw = null; nullRef.recipe!.servingsBlockIds.push("note"); assert.throws(() => validateAnalysis(nullRef, 1), /nicht zugeordnet/);
  const range = mutate(); range.blocks[0].text = "Synthetische Apfelpfanne · 2–4 Portionen"; range.recipe!.servingsRaw = "2–4 Portionen"; assert.throws(() => validateAnalysis(range, 1), /eindeutig/);
});
test("legacy OCR stays readable but cannot become an empty manual form", () => {
  const legacy = { ...synthetic, recipe: undefined }; validateAnalysis(legacy, 1);
  assert.throws(() => draftFromAnalysis(legacy), /ältere Entwurf/);
});

test("absent quantities stay absent and missing details do not require invented answers", () => {
  const source = structuredClone(synthetic);
  source.blocks[1].text = "Apfel";
  source.recipe!.ingredients[0] = { amount: null, unit: null, name: "Apfel", blockIds: ["apple"] };
  source.issues = [{ id: "missing", message: "Keine Backofentemperatur angegeben.", blockIds: ["step"], kind: "missing" }];
  validateAnalysis(source, 1);
  const draft = { ...draftFromAnalysis(source), confirmed: true };
  assert.match(draft.ingredients, /^\? \|  \| Apfel/);
  const result = validateReview(draft, source, {});
  assert.match(result.resolutions.missing, /nicht angegeben/);
  assert.equal(result.draft.ingredients, draft.ingredients);
  source.issues.push({ id: "unclear", message: "1 oder 7?", blockIds: ["apple"], kind: "unclear" });
  assert.throws(() => validateReview(draft, source, {}), /Offene Lesefragen/);
  delete source.issues[1].kind; // Old drafts must remain blocking rather than silently classified.
  assert.throws(() => validateReview(draft, source, {}), /Offene Lesefragen/);
});

test("unreadable source text cannot be downgraded to an absent optional value", () => {
  const source = structuredClone(synthetic);
  source.blocks[1].text += " [unleserlich]";
  source.issues = [{ id: "wrong", message: "Menge fehlt", blockIds: ["apple"], kind: "missing" }];
  assert.throws(() => validateAnalysis(source, 1), /Unleserliche Angaben/);
});

test("a source without directions stays incomplete instead of inventing steps", () => {
  const source = structuredClone(synthetic);
  source.blocks = source.blocks.filter((block) => !["step", "note"].includes(block.id));
  source.recipe!.steps = []; source.recipe!.equipment = []; source.recipe!.notes = [];
  source.issues = [{ id: "directions", message: "Keine Zubereitung in der Vorlage.", blockIds: [], kind: "missing" }];
  validateAnalysis(source, 1);
  const draft = { ...draftFromAnalysis(source), confirmed: true };
  assert.equal(validateReview(draft, source, {}).draft.steps, "");
  source.recipe!.ingredients = [];
  assert.throws(() => validateAnalysis(source, 1), /Kein Rezeptinhalt/);
});
