import { remoteApiBase } from "./deployment.ts";
export const remoteSessionKey = "digitales-rezeptbuch-private-session-v1";
export const remoteSessionEvent = "recipe-session-changed";
export const apiFetch: typeof fetch = async (input, init) => {
  if (!remoteApiBase || typeof input !== "string" || !input.startsWith("/api/")) return fetch(input, init);
  const headers = new Headers(init?.headers);
  let session = "";
  try { session = localStorage.getItem(remoteSessionKey) ?? ""; } catch { /* Keep the local library usable. */ }
  if (session) headers.set("X-Recipe-Session", session);
  const response = await fetch(`${remoteApiBase}${input}`, { ...init, headers, credentials: "omit", mode: "cors", redirect: "error", referrerPolicy: "no-referrer" });
  if (response.status === 401 && session) {
    localStorage.removeItem(remoteSessionKey); window.dispatchEvent(new Event(remoteSessionEvent));
  }
  return response;
};
