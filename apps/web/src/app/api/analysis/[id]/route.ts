import { authorize, configured, confirmJob, localRequest, openJobs } from "@/lib/analysis-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  if (!localRequest(request) || !configured()) return reply({ error: "Nicht verfügbar." }, 403);
  const db = openJobs();
  try {
    const job = authorize(db, (await context.params).id, request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
    if (!job) return reply({ error: "Auftrag nicht gefunden." }, 404);
    if (new URL(request.url).searchParams.get("source") === "1") return new Response(Buffer.from(job.source), { headers: { "Content-Type": job.mime, "Content-Disposition": "attachment", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    return reply({ id: job.id, name: job.name, mime: job.mime, state: job.state, error: job.error, result: job.result ? JSON.parse(job.result) : null, model: job.model });
  } finally { db.close(); }
}
export async function POST(request: Request, context: Context) {
  if (!localRequest(request) || !configured()) return reply({ error: "Nicht verfügbar." }, 403);
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length < 1 || length > 1000000) return reply({ error: "Ungültige Größe der Prüfantwort." }, 413);
  const db = openJobs();
  try {
    const job = authorize(db, (await context.params).id, request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
    if (!job) return reply({ error: "Auftrag nicht gefunden." }, 404);
    const data = await request.json();
    if (data.action === "cancel") {
      db.prepare("UPDATE jobs SET state='cancelled' WHERE id=? AND state IN ('queued','processing','needs_review')").run(job.id);
      return reply({ state: "cancelled" });
    }
    if (data.action !== "confirm") return reply({ error: "Unbekannte Aktion." }, 422);
    return reply({ recipe: confirmJob(db, job, data.draft, data.resolutions) });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : "Freigabe fehlgeschlagen." }, 422); }
  finally { db.close(); }
}
