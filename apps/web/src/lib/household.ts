import { parsePreferences, type LocalPreferences } from "./local-preferences.ts";
export type HouseholdState = Pick<LocalPreferences, "plan" | "adopted" | "purchased" | "manualItems">;
export const emptyHousehold = (): HouseholdState => ({ plan: Array(7).fill(null), adopted: false, purchased: {}, manualItems: [] });
export function parseHousehold(value: unknown): HouseholdState | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!raw.purchased || Object.keys(raw.purchased).some(key => ["__proto__", "constructor", "prototype"].includes(key))) return null;
  const parsed = parsePreferences(JSON.stringify({ ...raw, favorites: [], checks: {}, catalog: { version: 1, foods: [] }, metadata: {} }));
  if (!parsed) return null;
  return { plan: parsed.plan.map(slot => slot ? { recipeId: slot.recipeId, servings: slot.servings } : null), adopted: parsed.adopted, purchased: Object.fromEntries(Object.entries(parsed.purchased).sort(([a], [b]) => a.localeCompare(b))), manualItems: parsed.manualItems.map(({ id, text, done }) => ({ id, text, done })) };
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export function mergeHousehold(base: HouseholdState, local: HouseholdState, remote: HouseholdState, preferLocal = false): { state: HouseholdState; conflicts: string[] } {
  const conflicts: string[] = [];
  function choose<T>(before: T, mine: T, theirs: T, name: string): T {
    if (same(mine, before)) return theirs;
    if (same(theirs, before) || same(mine, theirs)) return mine;
    conflicts.push(name); return preferLocal ? mine : theirs;
  }
  const purchased: Record<string, number> = {};
  for (const key of new Set([...Object.keys(base.purchased), ...Object.keys(local.purchased), ...Object.keys(remote.purchased)])) {
    const next = choose(base.purchased[key], local.purchased[key], remote.purchased[key], "Gekaufte Mengen"); if (next !== undefined) purchased[key] = next;
  }
  const records = [base, local, remote].map(state => new Map(state.manualItems.map(item => [item.id, item])));
  const manualItems: HouseholdState["manualItems"] = [];
  for (const id of new Set([...remote.manualItems.map(item => item.id), ...local.manualItems.map(item => item.id), ...base.manualItems.map(item => item.id)])) {
    const next = choose(records[0].get(id), records[1].get(id), records[2].get(id), "Eigene Einkaufsposten"); if (next) manualItems.push(next);
  }
  return { state: { plan: base.plan.map((slot, index) => choose(slot, local.plan[index], remote.plan[index], `Wochenplan (${index + 1})`)), adopted: choose(base.adopted, local.adopted, remote.adopted, "Einkaufsliste"), purchased, manualItems }, conflicts: [...new Set(conflicts)] };
}
