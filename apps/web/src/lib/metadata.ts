import type { Recipe } from "./types.ts";

export const tagRuleVersion = "2026-10-27.1";
export type TagSuggestion = { tag: string; evidence: string; version: string };
export function suggestTags(recipe: Recipe): TagSuggestion[] {
  const suggestions: TagSuggestion[] = [];
  const add = (tag: string, evidence: string) => {
    if (!suggestions.some((item) => item.tag === tag)) suggestions.push({ tag, evidence, version: tagRuleVersion });
  };
  const title = recipe.title.toLocaleLowerCase("de");
  for (const [tag, pattern] of [
    ["Suppe", /suppe|eintopf/], ["Salat", /salat/],
    ["Dessert", /dessert|crumble|pudding/], ["Gebäck", /kuchen|torte|keks|gebäck/],
  ] as const) if (pattern.test(title)) add(tag, `Titel: ${recipe.title}`);
  for (const item of recipe.ingredients) {
    for (const [tag, pattern] of [
      ["Fleisch", /rind|schwein|huhn|hühner|hähnchen|hendl|pute|speck|schinken|hackfleisch|faschiert|lamm|fleisch/],
      ["Fisch", /fisch|lachs|forelle|thunfisch|garnele/],
      ["Gemüse", /karotte|möhre|kürbis|tomate|zwiebel|lauch|spinat|brokkoli|paprika|zucchini|kartoffel/],
      ["Hülsenfrüchte", /linse|bohne|kichererbse/],
      ["Milchprodukte", /milch|sahne|obers|butter|käse|topfen|quark|joghurt/],
    ] as const) if (pattern.test(item.name.toLocaleLowerCase("de"))) add(tag, `Zutat: ${item.name}`);
  }
  // Absence of a keyword is not evidence for vegan, vegetarian or allergen claims.
  return suggestions;
}

export const nutrientNames = ["kcal", "protein", "carbs", "fat"] as const;
export type Nutrient = typeof nutrientNames[number];
export type Food = {
  id: string; name: string; state: string; source: string; version: string; license: string;
  per100g: Record<Nutrient, number | null>;
};
export type FoodCatalog = { version: 1; foods: Food[] };
export type RecipeMetadata = { tags?: string[]; foodByIngredient?: Record<string, string> };
export function parseCatalog(value: unknown): FoodCatalog {
  if (!value || typeof value !== "object" || (value as FoodCatalog).version !== 1
    || !Array.isArray((value as FoodCatalog).foods) || (value as FoodCatalog).foods.length > 500) throw new Error("Ungültiger Lebensmittelkatalog (maximal 500 Einträge).");
  const ids = new Set<string>();
  const foods = (value as FoodCatalog).foods.map((food) => {
    if (!food || typeof food !== "object" || ![food.id, food.name, food.state, food.source, food.version, food.license].every((text) => typeof text === "string" && text.trim().length > 0 && text.length <= 500)
      || ids.has(food.id) || !food.per100g || !nutrientNames.every((key) => food.per100g[key] === null || (typeof food.per100g[key] === "number" && Number.isFinite(food.per100g[key]) && food.per100g[key]! >= 0 && food.per100g[key]! <= 10000))) throw new Error("Ungültiger Lebensmittelwert oder fehlende Quelle, Version, Zustand bzw. Lizenz.");
    ids.add(food.id);
    return { id: food.id, name: food.name, state: food.state, source: food.source, version: food.version, license: food.license, per100g: Object.fromEntries(nutrientNames.map((key) => [key, food.per100g[key]])) as Food["per100g"] };
  });
  return { version: 1, foods };
}

export function calculateNutrition(recipe: Recipe, catalog: FoodCatalog, mapping: Record<string, string> = {}) {
  const foods = new Map(catalog.foods.map((food) => [food.id, food]));
  const totals = Object.fromEntries(nutrientNames.map((key) => [key, { subtotal: 0, missing: [] as string[] }])) as Record<Nutrient, { subtotal: number; missing: string[] }>;
  const contributions = recipe.ingredients.map((ingredient) => {
    const food = foods.get(mapping[ingredient.id]);
    const factor = ingredient.unit === "g" ? 1 : ingredient.unit === "kg" ? 1000 : ingredient.unit === "dag" ? 10 : null;
    const grams = ingredient.quantity !== null && factor !== null ? ingredient.quantity * factor : null;
    for (const key of nutrientNames) {
      const value = food?.per100g[key];
      if (grams === null || value === null || value === undefined) totals[key].missing.push(ingredient.name);
      else totals[key].subtotal += grams / 100 * value;
    }
    return { ingredient: ingredient.name, food, grams };
  });
  return { totals, contributions, servings: recipe.servings };
}
