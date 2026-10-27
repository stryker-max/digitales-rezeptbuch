import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(import.meta.dirname, "../dist/pages");
const base = process.env.PAGES_BASE_PATH ?? "/digitales-rezeptbuch";
const port = Number(process.env.PORT ?? 3120);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    if (!url.pathname.startsWith(`${base}/`)) { response.writeHead(404); response.end(); return; }
    let file = resolve(root, "." + decodeURIComponent(url.pathname.slice(base.length)));
    if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    response.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" }); response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
}).listen(port, "127.0.0.1", () => console.log(`Pages-Prüfserver: http://127.0.0.1:${port}${base}/`));
