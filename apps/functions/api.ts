import { waitUntil } from "@neon/functions";
import { initializeRuntime } from "./runtime.ts";
import { ownerSession, signInOwner } from "./owner-auth.ts";
import { passkeyRequest } from "./passkeys.ts";
import * as analysis from "../web/src/app/api/analysis/route.ts";
import * as job from "../web/src/app/api/analysis/[id]/route.ts";
import * as collection from "../web/src/app/api/collection/route.ts";
import * as archive from "../web/src/app/api/collection/[id]/route.ts";
import * as chatgpt from "../web/src/app/api/chatgpt/route.ts";

export async function apiHandler(request: Request): Promise<Response> {
  try { initializeRuntime(); } catch { return Response.json({ error: "Private Einrichtung nicht verfügbar." }, { status: 503 }); }
  const origin = process.env.RECIPE_APP_ORIGIN;
  const cors = { "Access-Control-Allow-Origin": origin ?? "", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Recipe-Session, X-Recipe-Setup", "Access-Control-Max-Age": "600", "Cache-Control": "no-store", "Vary": "Origin", "X-Content-Type-Options": "nosniff" };
  const finish = (response: Response) => { const headers = new Headers(response.headers); for (const [key, value] of Object.entries(cors)) headers.set(key, value); return new Response(response.body, { status: response.status, headers }); };
  const reply = (error: string, status: number) => finish(Response.json({ error }, { status }));
  const path = new URL(request.url).pathname;
  if (path === "/_health" && request.method === "GET") return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  if (!origin || !/^https:\/\//.test(origin)) return reply("Private Einrichtung fehlt.", 503);
  if (request.headers.get("origin") && request.headers.get("origin") !== origin) return reply("Ursprung nicht erlaubt.", 403);
  if (request.method === "OPTIONS") return finish(new Response(null, { status: 204 }));
  if (!["GET", "POST"].includes(request.method)) return reply("Methode nicht erlaubt.", 405);
  if (request.method === "POST" && request.headers.get("origin") !== origin) return reply("Ursprung erforderlich.", 403);
  try {
    initializeRuntime();
    const session = ownerSession();
    if (path === "/api/session") return finish(await signInOwner(request));
    if (path === "/api/passkey") return finish(await passkeyRequest(request));
    if (!session.verify(request.headers.get("x-recipe-session") ?? "")) return reply("Privates Rezeptbuch zuerst anmelden.", 401);
    // Only our verified owner reaches the existing internal route handlers.
    // External owner/forwarded headers are never trusted or forwarded.
    const url = new URL(request.url), internal = new URL("http://127.0.0.1:3135"); internal.pathname = path; internal.search = url.search;
    const headers = new Headers({ host: internal.host, origin: internal.origin, "x-recipe-owner": process.env.RECIPE_INTERNAL_TOKEN! });
    for (const key of ["authorization", "content-type", "content-length"]) { const value = request.headers.get(key); if (value !== null) headers.set(key, value); }
    const incoming = new Request(internal, { method: request.method, headers, ...(request.body ? { body: request.body, duplex: "half" } : {}) } as RequestInit);
    let response: Response;
    if (path === "/api/analysis") response = request.method === "GET" ? await analysis.GET(incoming) : await analysis.POST(incoming);
    else if (path === "/api/chatgpt") response = request.method === "GET" ? await chatgpt.GET(incoming) : await chatgpt.POST(incoming);
    else if (path === "/api/collection" && request.method === "GET") response = await collection.GET(incoming);
    else if (/^\/api\/analysis\/[0-9a-f-]{36}$/i.test(path)) { const context = { params: Promise.resolve({ id: path.split("/").pop()! }) }; response = request.method === "GET" ? await job.GET(incoming, context) : await job.POST(incoming, context); }
    else if (/^\/api\/collection\/[0-9a-f-]{36}$/i.test(path) && request.method === "GET") response = await archive.GET(incoming, { params: Promise.resolve({ id: path.split("/").pop()! }) });
    else return reply("Nicht gefunden.", 404);
    if (path === "/api/analysis" && request.method === "POST" && response.status === 202) {
      const target = process.env.RECIPE_WORKER_URL, secret = process.env.RECIPE_WORKER_SECRET;
      if (target && secret && /^https:\/\/br-[a-z0-9-]+\.compute\.[a-z0-9.-]+\.neon\.tech\/$/.test(target)) {
        // Durable DB queue + independent scheduled worker remain authoritative.
        // This short notification just starts the separate worker promptly.
        waitUntil(fetch(target + "wake", { method: "POST", headers: { "x-recipe-worker": secret }, redirect: "error", signal: AbortSignal.timeout(650000) }).then(response => response.body?.cancel()).catch(() => {}));
      }
    }
    return finish(response);
  } catch { return reply("Privater Dienst vorübergehend nicht erreichbar. Gespeicherte Daten bleiben erhalten.", 503); }
}
export default { fetch: apiHandler };
