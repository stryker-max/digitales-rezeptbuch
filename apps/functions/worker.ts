import { parseTriggerDelivery } from "@neon/functions/triggers";
import { initializeRuntime } from "./runtime.ts";
import { sameSecret } from "./owner-auth.ts";
import { postgresPool, PostgresJobs } from "../web/src/lib/postgres-store.ts";
import { chatgptRuntime } from "../web/src/lib/chatgpt-server.ts";
import { processOneAboJob } from "../worker/process-abo-job.ts";

export async function workerHandler(request: Request): Promise<Response> {
  try { initializeRuntime(); } catch { return new Response("Private Einrichtung fehlt.", { status: 503 }); }
  if (request.method !== "POST") return new Response("Privater Worker.", { status: 401 });
  const path = new URL(request.url).pathname;
  if (path === "/cron") {
    const delivery = await parseTriggerDelivery(request);
    if (!delivery.ok || delivery.invocation.type !== "schedule" || delivery.invocation.trigger.name !== "recipe-queue-recovery") return new Response("Ungültiger Worker-Aufruf.", { status: 401 });
  } else if (path === "/wake") {
    const expected = process.env.RECIPE_WORKER_SECRET ?? "";
    if (expected.length < 43 || !sameSecret(expected, request.headers.get("x-recipe-worker") ?? "")) return new Response("Privater Zugang erforderlich.", { status: 401 });
  } else return new Response("Nicht gefunden.", { status: 404 });
  try {
    initializeRuntime();
    const limit = Number(process.env.ANALYSIS_DAILY_CALL_LIMIT ?? "20");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Ungültiges Tageslimit.");
    const pool = await postgresPool(), client = await pool.connect(); let locked = false;
    try {
      locked = (await client.query("SELECT pg_try_advisory_lock(194729,4) AS locked")).rows[0].locked;
      if (!locked) return Response.json({ busy: true }, { status: 202 });
      await client.query("UPDATE rb_jobs SET state='failed',error='Verarbeitung unterbrochen; Anbieterstatus unklar. Bewusst neu starten.' WHERE state='processing' AND started < $1", [new Date(Date.now()-5*60000).toISOString()]);
      const jobs = new PostgresJobs(pool); let processed = 0;
      while (processed < 3 && await processOneAboJob(jobs, chatgptRuntime().client, limit)) processed++;
      if (path === "/cron" && (await chatgptRuntime().client.getSession()).sharing) {
        try { await chatgptRuntime().client.renewSession(); }
        catch { console.info("recipe-worker renewal unavailable; existing authorization preserved where recoverable"); }
      }
      console.info(`recipe-worker ${path === "/cron" ? "scheduled" : "notified"}: ${processed}`);
      return Response.json({ processed });
    } finally {
      let broken = false;
      if (locked) { try { await client.query("SELECT pg_advisory_unlock(194729,4)"); } catch { broken = true; } }
      client.release(broken);
    }
  } catch { return new Response("Worker vorübergehend nicht erreichbar. Auftrag bleibt gespeichert.", { status: 503 }); }
}
export default { fetch: workerHandler };
