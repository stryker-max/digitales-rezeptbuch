import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
const root = resolve(import.meta.dirname, "../apps/web");
const buildId = (await readFile(resolve(root, ".next/BUILD_ID"), "utf8")).trim();
async function walk(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(async (item) => item.isDirectory() ? walk(resolve(dir, item.name)) : [resolve(dir, item.name)]))).flat();
}
const assets = (await walk(resolve(root, ".next/static"))).filter((file) => /\.(js|css|woff2?)$/.test(file)).map((file) => "/_next/static/" + relative(resolve(root, ".next/static"), file).replaceAll("\\", "/"));
const template = await readFile(resolve(root, "src/offline/service-worker.js"), "utf8");
await writeFile(resolve(root, "public/sw.js"), template.replace("__CACHE_NAME__", JSON.stringify(`rezeptbuch-shell-${buildId}`)).replace("__ASSETS__", JSON.stringify(["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/beispielgerichte.webp", ...assets])));
console.log(`Offline-Shell: ${assets.length} versionsgebundene Dateien.`);
