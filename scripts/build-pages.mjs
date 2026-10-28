import { build } from "vite";
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
const root = resolve(import.meta.dirname, "..");
const basePath = process.env.PAGES_BASE_PATH ?? "/digitales-rezeptbuch";
if (!/^\/[a-zA-Z0-9_-]+$/.test(basePath) && basePath !== "") throw new Error("Ungültiger Pages-Unterpfad.");
const publicBackend = JSON.parse(await readFile(resolve(root, "apps/pages/remote-api.json"), "utf8"));
const remoteApiBase = process.env.RECIPE_PAGES_API_BASE ?? publicBackend.apiBase;
if (remoteApiBase && !/^https:\/\/br-[a-z0-9-]+\.compute\.[a-z0-9.-]+\.neon\.tech$/.test(remoteApiBase)) throw new Error("Ungültiger privater API-Ursprung.");
const outDir = resolve(root, "dist/pages");
await build({
  root: resolve(root, "apps/pages"), base: `${basePath}/`, publicDir: resolve(root, "apps/web/public"),
  resolve: { alias: { "@": resolve(root, "apps/web/src") } },
  define: { "process.env.NODE_ENV": JSON.stringify("production"), "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(basePath), "process.env.NEXT_PUBLIC_STATIC_HOSTING": JSON.stringify("true"), "process.env.NEXT_PUBLIC_RECIPE_API_BASE": JSON.stringify(remoteApiBase) },
  build: { outDir, emptyOutDir: true },
});
const manifest = { name: "Digitales Rezeptbuch", short_name: "Digitales Rezeptbuch", description: "Deine Rezepte. Einfach gut kochen.", start_url: "./", scope: "./", display: "standalone", background_color: "#0F172A", theme_color: "#0F172A", lang: "de", icons: [192, 512].map((size) => ({ src: `./icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png" })) };
await writeFile(resolve(outDir, "manifest.webmanifest"), JSON.stringify(manifest));
await writeFile(resolve(outDir, ".nojekyll"), "");
async function walk(dir) { return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (item) => item.isDirectory() ? walk(resolve(dir, item.name)) : [resolve(dir, item.name)]))).flat(); }
const files = (await walk(outDir)).filter((file) => !["sw.js", ".nojekyll"].includes(relative(outDir, file)));
const hash = createHash("sha256");
for (const file of files.sort()) hash.update(relative(outDir, file)).update(await readFile(file));
const cache = `rezeptbuch-pages-${basePath.replaceAll("/", "")}-${hash.digest("hex").slice(0, 16)}`;
const assets = files.map((file) => `${basePath}/${relative(outDir, file).replaceAll("\\", "/")}`).concat(`${basePath}/`);
const worker = `const CACHE=${JSON.stringify(cache)}, ASSETS=${JSON.stringify(assets)}, HOME=${JSON.stringify(`${basePath}/`)};
self.addEventListener('install',event=>event.waitUntil((async()=>{try{await(await caches.open(CACHE)).addAll(ASSETS)}catch(error){await caches.delete(CACHE);throw error}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(${JSON.stringify(`rezeptbuch-pages-${basePath.replaceAll("/", "")}-`)})&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE')self.skipWaiting();if(event.data==='CHECK')event.waitUntil((async()=>{const cache=await caches.open(CACHE);event.ports[0]?.postMessage({complete:(await Promise.all(ASSETS.map(asset=>cache.match(asset)))).every(Boolean)})})())});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;const path=request.mode==='navigate'&&[HOME,HOME+'index.html'].includes(url.pathname)?HOME:url.pathname;if(!ASSETS.includes(path))return;event.respondWith((async()=>(await(await caches.open(CACHE)).match(path))||fetch(request))())});`;
await writeFile(resolve(outDir, "sw.js"), worker);
console.log(`GitHub-Pages-Paket fertig: ${assets.length} Dateien, Unterpfad ${basePath || "/"}.`);
