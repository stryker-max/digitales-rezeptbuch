import { sha256, type LocalRecipe } from "./local-store.ts";
import { parsePreferences, type LocalPreferences } from "./local-preferences.ts";
import { validateAnalysis } from "./analysis-contract.ts";

const archiveVersion = 2;
const maxArchiveBytes = 100 * 1024 * 1024;
const maxSourceBytes = 25 * 1024 * 1024;
const sourceTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"]);

type ArchiveRecipe = Omit<LocalRecipe, "sourceBlob"> & { sourceBase64: string };
type Archive = { app: "Digitales Rezeptbuch"; version: 2; createdAt: string; recipes: ArchiveRecipe[]; preferences?: LocalPreferences };

function encodeBase64(bytes: Uint8Array): string {
  let output = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    output += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(output);
}

function decodeBase64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) throw new Error("Ungültige Originaldaten in der Sicherung.");
  const decoded = atob(value);
  if (decoded.length > maxSourceBytes) throw new Error("Eine Originaldatei ist zu groß.");
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

const shortText = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;

export function validateRecipeContent(entry: Record<string, unknown>): void {
  if (entry.sourceNotes !== undefined && (!Array.isArray(entry.sourceNotes) || entry.sourceNotes.length > 202 || !entry.sourceNotes.every((note: unknown) => shortText(note, 4000)))) throw new Error("Ungültige Originalhinweise.");
  if (!shortText(entry.description, 1000) || !shortText(entry.sourceText, 1_000_000)
    || !shortText(entry.createdAt, 40) || !Number.isFinite(Date.parse(entry.createdAt))
    || !Array.isArray(entry.tags) || entry.tags.length > 20 || !entry.tags.every((tag: unknown) => shortText(tag, 50))
    || (entry.servings !== null && (!Number.isInteger(entry.servings) || Number(entry.servings) < 1 || Number(entry.servings) > 100))
    || entry.estimatedMinutes !== null
    || !Array.isArray(entry.ingredients) || entry.ingredients.length > 100
    || !Array.isArray(entry.equipment) || entry.equipment.length > 50
    || !Array.isArray(entry.steps) || entry.steps.length > 200) {
    throw new Error("Rezeptinhalt der Sicherung ist ungültig.");
  }
  for (const ingredient of entry.ingredients as unknown[]) {
    if (!ingredient || typeof ingredient !== "object") throw new Error("Ungültige Zutat.");
    const item = ingredient as Record<string, unknown>;
    if (!shortText(item.id, 200) || !shortText(item.name, 200) || !shortText(item.amountText, 100)
      || !shortText(item.group, 100) || (item.unit !== null && !shortText(item.unit, 40))
      || (item.quantity !== null && (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity < 0))) throw new Error("Ungültige Zutat.");
  }
  for (const equipment of entry.equipment as unknown[]) {
    if (!equipment || typeof equipment !== "object") throw new Error("Ungültiges Utensil.");
    const item = equipment as Record<string, unknown>;
    if (!shortText(item.name, 200) || !["source", "suggestion"].includes(String(item.origin))) throw new Error("Ungültiges Utensil.");
  }
  for (const step of entry.steps as unknown[]) {
    if (!step || typeof step !== "object") throw new Error("Ungültiger Arbeitsschritt.");
    const item = step as Record<string, unknown>;
    if (!shortText(item.title, 200) || !shortText(item.instruction, 10_000)
      || !Array.isArray(item.relatedIngredients) || item.relatedIngredients.length > 100
      || !item.relatedIngredients.every((name: unknown) => shortText(name, 200))) throw new Error("Ungültiger Arbeitsschritt.");
  }
}

export async function createArchive(recipes: LocalRecipe[], preferences?: LocalPreferences): Promise<Blob> {
  if (recipes.length > 100) throw new Error("Für mehr als 100 Rezepte ist der spätere serverseitige Export nötig.");
  const entries: ArchiveRecipe[] = [];
  for (const recipe of recipes) {
    validateRecipeContent(recipe);
    if (recipe.sourceBlob.size > maxSourceBytes) throw new Error(`${recipe.title}: Originaldatei ist zu groß.`);
    if (await sha256(recipe.sourceBlob) !== recipe.sourceHash) throw new Error(`${recipe.title}: Prüfsumme des Originals stimmt nicht.`);
    const { sourceBlob, ...metadata } = recipe;
    entries.push({ ...metadata, sourceBase64: encodeBase64(new Uint8Array(await sourceBlob.arrayBuffer())) });
  }
  if (preferences && !parsePreferences(JSON.stringify(preferences))) throw new Error("Ungültige Plan- oder Zusatzdaten.");
  const payload: Archive = { app: "Digitales Rezeptbuch", version: archiveVersion, createdAt: new Date().toISOString(), recipes: entries, preferences: preferences ? parsePreferences(JSON.stringify(preferences))! : undefined };
  const file = new Blob([JSON.stringify(payload)], { type: "application/json" });
  if (file.size > maxArchiveBytes) throw new Error("Die Sicherung ist für den lokalen Export zu groß.");
  return file;
}

export async function readArchive(file: File): Promise<LocalRecipe[]> {
  return (await readFullArchive(file)).recipes;
}

export async function readFullArchive(file: File): Promise<{ recipes: LocalRecipe[]; preferences?: LocalPreferences }> {
  if (file.size > maxArchiveBytes) throw new Error("Die Sicherung ist zu groß.");
  let data: unknown;
  try { data = JSON.parse(await file.text()); }
  catch { throw new Error("Die Datei enthält keine gültige Sicherung."); }
  if (!data || typeof data !== "object") throw new Error("Ungültige Sicherung.");
  const archive = data as Record<string, unknown>;
  if (archive.app !== "Digitales Rezeptbuch" || (archive.version !== 1 && archive.version !== archiveVersion) || !Array.isArray(archive.recipes) || archive.recipes.length > 100) {
    throw new Error("Diese Sicherungsversion wird nicht unterstützt.");
  }
  const ids = new Set<string>();
  const restored: LocalRecipe[] = [];
  for (const raw of archive.recipes) {
    if (!raw || typeof raw !== "object") throw new Error("Ein Rezept in der Sicherung ist ungültig.");
    const entry = raw as Record<string, unknown>;
    if (typeof entry.id !== "string" || !/^[0-9a-f-]{36}$/i.test(entry.id) || ids.has(entry.id)
      || typeof entry.title !== "string" || !entry.title.trim() || entry.title.length > 200
      || entry.demo !== false || !Array.isArray(entry.ingredients) || !Array.isArray(entry.steps)
      || typeof entry.sourceText !== "string" || typeof entry.sourceName !== "string" || /[\\/]/.test(entry.sourceName)
      || typeof entry.sourceType !== "string" || !sourceTypes.has(entry.sourceType) || typeof entry.sourceHash !== "string" || !/^[0-9a-f]{64}$/.test(entry.sourceHash)
      || typeof entry.sourceBase64 !== "string" || entry.sourceBase64.length > 35_000_000) {
      throw new Error("Ein Rezept oder Original in der Sicherung ist ungültig.");
    }
    validateRecipeContent(entry);
    let analysis: LocalRecipe["analysis"];
    if (entry.analysis !== undefined) {
      const a = entry.analysis as NonNullable<LocalRecipe["analysis"]>;
      if (!a || !shortText(a.model, 200) || !shortText(a.promptVersion, 200) || !shortText(a.originalTranscription, 1000000) || !a.resolutions || typeof a.resolutions !== "object" || Array.isArray(a.resolutions) || Object.keys(a.resolutions).length > 100 || !Object.values(a.resolutions).every((text) => shortText(text, 2000))) throw new Error("Ungültige Analyseherkunft.");
      validateAnalysis({ status: "recipe", blocks: a.blocks, issues: a.issues, recipe: a.structured }, 10);
      analysis = { model: a.model, promptVersion: a.promptVersion, originalTranscription: a.originalTranscription, blocks: a.blocks, issues: a.issues, resolutions: a.resolutions, ...(a.structured ? { structured: a.structured } : {}) };
    }
    ids.add(entry.id);
    const bytes = decodeBase64(entry.sourceBase64);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    const sourceBlob = new Blob([buffer], { type: entry.sourceType });
    if (await sha256(sourceBlob) !== entry.sourceHash) throw new Error(`Prüfsumme für ${entry.title} stimmt nicht.`);
    restored.push({
      id: entry.id, title: entry.title, description: entry.description as string,
      tags: entry.tags as string[], servings: entry.servings as number | null,
      estimatedMinutes: null, demo: false,
      ingredients: entry.ingredients as LocalRecipe["ingredients"],
      equipment: entry.equipment as LocalRecipe["equipment"],
      steps: entry.steps as LocalRecipe["steps"],
      sourceText: entry.sourceText,
      ...(entry.sourceNotes ? { sourceNotes: entry.sourceNotes as string[] } : {}),
      sourceName: entry.sourceName, sourceType: entry.sourceType,
      sourceHash: entry.sourceHash, sourceBlob,
      createdAt: entry.createdAt as string,
      ...(analysis ? { analysis } : {}),
    });
  }
  const preferences = archive.preferences === undefined ? undefined : parsePreferences(JSON.stringify(archive.preferences));
  if (preferences === null) throw new Error("Plan- oder Zusatzdaten in der Sicherung sind ungültig.");
  if (preferences && preferences.plan.some((slot) => slot && !ids.has(slot.recipeId) && !["kuerbissuppe", "rigatoni", "hendl", "apfelcrumble"].includes(slot.recipeId))) throw new Error("Der gesicherte Plan verweist auf ein fehlendes Rezept.");
  return { recipes: restored, preferences };
}

export function sameRecipeContent(a: LocalRecipe, b: LocalRecipe): boolean {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)])) : value;
  const content = (r: LocalRecipe) => JSON.stringify(canonical([r.title, r.description, r.sourceHash, r.sourceText, r.servings, r.ingredients, r.equipment, r.steps, r.tags, r.sourceName, r.sourceType, r.createdAt, r.analysis, r.sourceNotes]));
  return content(a) === content(b);
}
