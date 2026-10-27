import type { PlanSlot, Recipe, ShoppingItem } from "./types.ts";

export function baseUnit(unit: string | null): { unit: string | null; factor: number } {
  if (unit === "kg") return { unit: "g", factor: 1000 };
  if (unit === "dag") return { unit: "g", factor: 10 };
  if (unit === "l") return { unit: "ml", factor: 1000 };
  return { unit, factor: 1 };
}

export function parseQuantity(text: string): number | null {
  const value = text.trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  const fraction = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(value);
  if (fraction && Number(fraction[3]) > 0) return Number(fraction[1] ?? 0) + Number(fraction[2]) / Number(fraction[3]);
  const unicode = /^(\d+)?([½¼¾⅓⅔⅛])$/.exec(value);
  const fractions: Record<string, number> = { "½": .5, "¼": .25, "¾": .75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": .125 };
  return unicode ? Number(unicode[1] ?? 0) + fractions[unicode[2]] : null;
}

export function shoppingForPlan(plan: PlanSlot[], recipes: Recipe[]): ShoppingItem[] {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const merged = new Map<string, ShoppingItem>();

  plan.forEach((slot, day) => {
    if (!slot) return;
    const recipe = byId.get(slot.recipeId);
    if (!recipe) return;
    for (const ingredient of recipe.ingredients) {
      const base = baseUnit(ingredient.unit);
      const key = `${ingredient.name.trim().toLocaleLowerCase("de-AT").normalize("NFC")}|${base.unit ?? ""}`;
      const quantity = ingredient.quantity !== null
        ? ingredient.quantity * base.factor * slot.servings / (recipe.servings ?? 1) : null;
      const existing = merged.get(key);
      if (existing) {
        existing.days.push(day);
        existing.required = existing.required !== null && quantity !== null ? existing.required + quantity : null;
      } else {
        merged.set(key, {
          key, name: ingredient.name, group: ingredient.group,
          required: quantity, unit: base.unit,
          amountText: ingredient.amountText, days: [day],
        });
      }
    }
  });

  return [...merged.values()];
}

export function remaining(required: number | null, purchased: number): number | null {
  return required === null ? null : Math.max(0, required - purchased);
}

export function suggestPlan(plan: PlanSlot[], recipes: Recipe[]): PlanSlot[] {
  if (!recipes.length) return [...plan];
  return plan.map((slot, day) => slot ?? {
    recipeId: recipes[day % recipes.length].id,
    servings: recipes[day % recipes.length].servings ?? 1,
  });
}
