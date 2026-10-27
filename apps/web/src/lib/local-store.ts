import type { Recipe } from "./types";
import type { AnalysisDraft } from "./analysis-contract.ts";

const databaseName = "digitales-rezeptbuch-local-v1";
const storeName = "recipes";

export type LocalRecipe = Recipe & {
  sourceName: string;
  sourceType: string;
  sourceHash: string;
  sourceBlob: Blob;
  createdAt: string;
  analysis?: { model: string; promptVersion: string; blocks: AnalysisDraft["blocks"]; issues: AnalysisDraft["issues"]; resolutions: Record<string, string>; originalTranscription: string };
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Lokaler Speicher konnte nicht geöffnet werden."));
  });
}

export async function listLocalRecipes(): Promise<LocalRecipe[]> {
  const database = await openDatabase();
  try {
    return await new Promise<LocalRecipe[]>((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
      request.onsuccess = () => resolve((request.result as LocalRecipe[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      request.onerror = () => reject(request.error ?? new Error("Rezepte konnten nicht geladen werden."));
    });
  } finally { database.close(); }
}

export async function saveLocalRecipe(recipe: LocalRecipe): Promise<void> {
  return saveLocalRecipes([recipe]);
}

export async function saveLocalRecipes(recipes: LocalRecipe[]): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      for (const recipe of recipes) store.add(recipe);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("Rezept konnte nicht gespeichert werden."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Speichern wurde abgebrochen."));
    });
  } finally { database.close(); }
}

export async function getLocalRecipe(id: string): Promise<LocalRecipe | undefined> {
  const database = await openDatabase();
  try {
    return await new Promise<LocalRecipe | undefined>((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result as LocalRecipe | undefined);
      request.onerror = () => reject(request.error ?? new Error("Original konnte nicht geladen werden."));
    });
  } finally { database.close(); }
}

export async function sha256(file: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
