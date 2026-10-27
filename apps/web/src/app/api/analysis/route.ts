import { configured, enqueue, localRequest, openJobs } from "@/lib/analysis-server";
import { inspectSource } from "@/lib/source-validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
export async function GET(request: Request) {
  if (!localRequest(request)) return reply({ error: "Nur im lokalen Betrieb verfügbar." }, 403);
  return reply({ enabled: configured() });
}
export async function POST(request: Request) {
  if (!localRequest(request)) return reply({ error: "Lokaler Ursprung erforderlich." }, 403);
  if (!configured()) return reply({ error: "KI-Abschrift ist nicht konfiguriert. Manuelle Übernahme bleibt verfügbar." }, 503);
  try {
    // Enforce while reading as Content-Length can be absent or forged.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Datei fehlt.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.length;
      if (size > 26 * 1024 * 1024) { await reader.cancel(); return reply({ error: "Upload zu groß." }, 413); }
      chunks.push(part.value);
    }
    const data = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
    const file = data.get("file"); const id = data.get("id"); const token = data.get("token");
    if (!(file instanceof File) || typeof id !== "string" || typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(token) || data.get("consent") !== "true" || data.get("oneRecipe") !== "true") throw new Error("Datei, Auftragskennung und ausdrückliche Übertragungsbestätigung erforderlich.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { pages } = await inspectSource(bytes, file.type);
    const db = openJobs();
    try { enqueue(db, { id, token, source: bytes, name: file.name.replace(/[\\/\x00-\x1f]/g, "_").slice(0, 200), mime: file.type, pages, model: process.env.OPENAI_MODEL! }); }
    finally { db.close(); }
    return reply({ id, state: "queued" }, 202);
  } catch (error) { return reply({ error: error instanceof Error && /Datei|Bild|PDF|KI-|Auftrag|Upload|Limit|limit|Bestätigung|Rezept/.test(error.message) ? error.message : "Datei konnte nicht geprüft oder gespeichert werden. Verschlüsselte oder beschädigte PDFs werden nicht unterstützt." }, 422); }
}
