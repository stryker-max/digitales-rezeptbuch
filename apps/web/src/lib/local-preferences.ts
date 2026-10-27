import type { PlanSlot } from "./types.ts";
import { parseCatalog, type FoodCatalog, type RecipeMetadata } from "./metadata.ts";
import { baseUnit } from "./plan.ts";

export type LocalPreferences = {
  plan: PlanSlot[];
  adopted: boolean;
  purchased: Record<string, number>;
  favorites: string[];
  checks: Record<string, boolean>;
  metadata: Record<string, RecipeMetadata>;
  catalog: FoodCatalog;
  manualItems: { id: string; text: string; done: boolean }[];
  cookSession: { recipeId: string; step: number; servings: number | null } | null;
};

export const preferencesKey = "digitales-rezeptbuch-preferences-v1";

export function parsePreferences(value: string | null): LocalPreferences | null {
  if (!value || value.length > 2_000_000) return null;
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { return null; }
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.plan) || data.plan.length !== 7 || typeof data.adopted !== "boolean"
    || !Array.isArray(data.favorites) || data.favorites.length > 100
    || !data.favorites.every((id: unknown) => typeof id === "string" && id.length <= 100)
    || !data.purchased || typeof data.purchased !== "object" || Array.isArray(data.purchased)
    || !data.checks || typeof data.checks !== "object" || Array.isArray(data.checks)) return null;
  if (!data.plan.every((slot: unknown) => slot === null || Boolean(slot && typeof slot === "object"
    && typeof (slot as Record<string, unknown>).recipeId === "string"
    && ((slot as Record<string, unknown>).recipeId as string).length <= 100
    && Number.isInteger((slot as Record<string, unknown>).servings)
    && Number((slot as Record<string, unknown>).servings) >= 1
    && Number((slot as Record<string, unknown>).servings) <= 100))) return null;
  const purchased = Object.entries(data.purchased);
  const checks = Object.entries(data.checks);
  if (purchased.length > 1000 || checks.length > 1000
    || !purchased.every(([key, amount]) => key.length <= 300 && typeof amount === "number" && Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000)
    || !checks.every(([key, checked]) => key.length <= 300 && typeof checked === "boolean")) return null;
  let catalog: FoodCatalog;
  try { catalog = data.catalog === undefined ? { version: 1, foods: [] } : parseCatalog(data.catalog); } catch { return null; }
  const metadata: Record<string, RecipeMetadata> = {};
  if (data.metadata !== undefined) {
    if (!data.metadata || typeof data.metadata !== "object" || Array.isArray(data.metadata) || Object.keys(data.metadata).length > 500) return null;
    for (const [id, raw] of Object.entries(data.metadata)) {
      if (!raw || typeof raw !== "object" || id.length > 100 || ["__proto__", "constructor", "prototype"].includes(id)) return null;
      const item = raw as RecipeMetadata;
      if (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.length > 20 || !item.tags.every((tag) => typeof tag === "string" && tag.length <= 50))) return null;
      if (item.foodByIngredient !== undefined && (!item.foodByIngredient || typeof item.foodByIngredient !== "object" || Array.isArray(item.foodByIngredient) || Object.entries(item.foodByIngredient).length > 100 || !Object.entries(item.foodByIngredient).every(([key, food]) => key.length <= 200 && typeof food === "string" && food.length <= 500))) return null;
      metadata[id] = { ...(item.tags !== undefined ? { tags: item.tags } : {}), ...(item.foodByIngredient ? { foodByIngredient: { ...item.foodByIngredient } } : {}) };
    }
  }
  const manualItems = data.manualItems ?? [];
  if (!Array.isArray(manualItems) || manualItems.length > 200 || !manualItems.every((item) => item && typeof item.id === "string" && item.id.length <= 100 && typeof item.text === "string" && item.text.length <= 300 && typeof item.done === "boolean") || new Set(manualItems.map((item) => item.id)).size !== manualItems.length) return null;
  const cook = data.cookSession;
  if (cook !== undefined && cook !== null && (typeof cook !== "object" || typeof (cook as Record<string, unknown>).recipeId !== "string" || String((cook as Record<string, unknown>).recipeId).length > 100 || !Number.isInteger((cook as Record<string, unknown>).step) || Number((cook as Record<string, unknown>).step) < 0 || Number((cook as Record<string, unknown>).step) > 203 || ((cook as Record<string, unknown>).servings !== null && (!Number.isInteger((cook as Record<string, unknown>).servings) || Number((cook as Record<string, unknown>).servings) < 1 || Number((cook as Record<string, unknown>).servings) > 100)))) return null;
  const normalizedPurchased: Record<string, number> = {};
  for (const [key, amount] of purchased) {
    const separator = key.lastIndexOf("|");
    const base = separator < 0 ? { unit: "", factor: 1 } : baseUnit(key.slice(separator + 1));
    const normalizedKey = separator < 0 ? key : key.slice(0, separator + 1) + (base.unit ?? "");
    normalizedPurchased[normalizedKey] = (normalizedPurchased[normalizedKey] ?? 0) + Number(amount) * base.factor;
  }
  return {
    plan: data.plan as PlanSlot[], adopted: data.adopted,
    purchased: normalizedPurchased, favorites: data.favorites as string[],
    checks: Object.fromEntries(checks),
    metadata, catalog, manualItems,
    cookSession: (cook ?? null) as LocalPreferences["cookSession"],
  };
}
