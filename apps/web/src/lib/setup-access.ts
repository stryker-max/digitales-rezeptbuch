// Keep the one-time setup permission only in this tab, across reloads/updates.
// No password or passkey is stored here. The server remains authoritative.
export const setupStorageKey = "digitales-rezeptbuch-setup-v1";
export const validSetup = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value);
type TabStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function saveSetup(storage: TabStorage, value: string) {
  if (!validSetup(value)) return;
  try { storage.setItem(setupStorageKey, value); } catch { /* In-memory setup still works. */ }
}
export function loadSetup(storage: TabStorage): string {
  try { const value = storage.getItem(setupStorageKey) ?? ""; if (validSetup(value)) return value; storage.removeItem(setupStorageKey); } catch { /* Storage can be unavailable. */ }
  return "";
}
export function forgetSetup(storage: TabStorage) { try { storage.removeItem(setupStorageKey); } catch { /* No persistent fallback. */ } }
