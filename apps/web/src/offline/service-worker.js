const CACHE = __CACHE_NAME__;
const ASSETS = __ASSETS__;
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try { await (await caches.open(CACHE)).addAll(ASSETS); }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("rezeptbuch-shell-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("message", (event) => {
  if (event.data === "ACTIVATE") self.skipWaiting();
  if (event.data === "CHECK") event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const complete = (await Promise.all(ASSETS.map((asset) => cache.match(asset)))).every(Boolean);
    event.ports[0]?.postMessage({ complete });
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const path = request.mode === "navigate" && url.pathname === "/" ? "/" : url.pathname;
  if (!ASSETS.includes(path) || (path === "/" && request.mode !== "navigate")) return;
  event.respondWith((async () => (await (await caches.open(CACHE)).match(path)) || fetch(request))());
});
