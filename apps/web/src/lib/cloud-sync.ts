import { readArchive, sameRecipeContent } from "./local-archive.ts";
import type { LocalRecipe } from "./local-store.ts";

// Add only immutable, user-confirmed server versions. Never replace local data.
export async function loadConfirmedCloudRecipes(local: LocalRecipe[], fetcher: typeof fetch = fetch): Promise<LocalRecipe[]> {
  const response = await fetcher("/api/collection", { cache: "no-store" });
  if (!response.ok) throw new Error("Private Sammlung nicht erreichbar. Lokale Rezepte bleiben verfügbar.");
  const data = await response.json();
  if (!Array.isArray(data.recipes) || data.recipes.length > 100) throw new Error("Ungültige private Sammlung.");
  const known = new Map(local.map(recipe => [recipe.id, recipe])), seen = new Set<string>(), fresh: LocalRecipe[] = [];
  let bytes = 0;
  for (const recipe of data.recipes) {
    if (!recipe || typeof recipe.id !== "string" || !/^[0-9a-f-]{36}$/i.test(recipe.id) || seen.has(recipe.id)) throw new Error("Ungültige private Rezeptkennung.");
    seen.add(recipe.id);
    const existing = known.get(recipe.id);
    if (existing) {
      if (!sameRecipeContent(existing, { ...recipe, sourceBlob: existing.sourceBlob })) throw new Error("Eine private Rezeptfassung widerspricht dem lokalen Bestand. Es wird nichts überschrieben.");
      continue;
    }
    const file = await fetcher(`/api/collection/${recipe.id}`, { cache: "no-store" });
    if (!file.ok) throw new Error("Ein privates Original konnte nicht geladen werden.");
    const blob = await file.blob(); bytes += blob.size;
    if (bytes > 90 * 1024 * 1024 && fresh.length) break;
    const restored = await readArchive(new File([blob], "privates-rezept.json", { type: "application/json" }));
    if (restored.length !== 1 || restored[0].id !== recipe.id || !sameRecipeContent(restored[0], { ...recipe, sourceBlob: restored[0].sourceBlob })) throw new Error("Private Originalfassung stimmt nicht mit der Sammlung überein.");
    fresh.push(restored[0]);
  }
  return fresh;
}
