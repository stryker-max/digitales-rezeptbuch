import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { createHash } from "node:crypto";
import { validateAnalysis, validateReview, promptVersion } from "./analysis-contract.ts";
import { parseQuantity } from "./plan.ts";

export type Job = { id: string; token_hash: string; source: Uint8Array; name: string; mime: string; hash: string; pages: number; state: string; result: string | null; error: string | null; model: string; created: string; started: string | null; confirmed: string | null; auth_kind: "api" | "chatgpt"; profile_id: string | null; prompt_version: string };
export function openJobs(path?: string) {
  if (!path) {
    if (!process.env.RECIPE_DATA_DIR || !isAbsolute(process.env.RECIPE_DATA_DIR)) throw new Error("RECIPE_DATA_DIR muss auf einen privaten absoluten Ordner zeigen.");
    const dir = resolve(process.env.RECIPE_DATA_DIR);
    mkdirSync(dir, { recursive: true }); path = resolve(dir, "analysis.sqlite");
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, source BLOB NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, hash TEXT NOT NULL, pages INTEGER NOT NULL, state TEXT NOT NULL, result TEXT, error TEXT, model TEXT NOT NULL, created TEXT NOT NULL, started TEXT, confirmed TEXT); CREATE TABLE IF NOT EXISTS calls(day TEXT PRIMARY KEY, count INTEGER NOT NULL);");
  const columns = (db.prepare("PRAGMA table_info(jobs)").all() as { name: string }[]).map((column) => column.name);
  if (!columns.includes("auth_kind")) db.exec("ALTER TABLE jobs ADD COLUMN auth_kind TEXT NOT NULL DEFAULT 'api'");
  if (!columns.includes("profile_id")) db.exec("ALTER TABLE jobs ADD COLUMN profile_id TEXT");
  if (!columns.includes("prompt_version")) db.exec("ALTER TABLE jobs ADD COLUMN prompt_version TEXT NOT NULL DEFAULT 'recipe-transcription-2026-10-27.1'");
  return db;
}
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function configured() { return process.env.LOCAL_ANALYSIS_ENABLED === "true" && Boolean(process.env.RECIPE_DATA_DIR) && (process.env.ANALYSIS_AUTH_MODE === "chatgpt" ? Boolean(process.env.RECIPE_CHATGPT_DIR) : Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL)); }
export function localRequest(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const forwarded = request.headers.get("x-forwarded-host");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host ?? "") || (forwarded !== null && forwarded !== host)) return false;
  const origin = request.headers.get("origin");
  const expectedOrigin = `${url.protocol}//${host}`;
  return request.method === "GET" ? !origin || origin === expectedOrigin : origin === expectedOrigin;
}
export function authorize(db: DatabaseSync, id: string, token: string): Job | undefined {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(token)) return undefined;
  return db.prepare("SELECT * FROM jobs WHERE id=? AND token_hash=?").get(id, tokenHash(token)) as Job | undefined;
}
export function enqueue(db: DatabaseSync, input: { id: string; token: string; source: Uint8Array; name: string; mime: string; pages: number; model: string; authKind?: "api" | "chatgpt"; profileId?: string }) {
  const hash = createHash("sha256").update(input.source).digest("hex");
  const existing = db.prepare("SELECT hash,token_hash,model,auth_kind,profile_id FROM jobs WHERE id=?").get(input.id) as { hash: string; token_hash: string; model: string; auth_kind: string; profile_id: string | null } | undefined;
  if (existing) {
    if (existing.hash !== hash || existing.token_hash !== tokenHash(input.token) || existing.model !== input.model || existing.auth_kind !== (input.authKind ?? "api") || existing.profile_id !== (input.profileId ?? null)) throw new Error("Auftragskonflikt.");
    return;
  }
  db.exec("BEGIN IMMEDIATE");
  try {
    const pending = db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE state IN ('queued','processing')").get() as { n: number };
    const total = db.prepare("SELECT COUNT(*) AS n FROM jobs").get() as { n: number };
    if (pending.n >= 3 || total.n >= 100) throw new Error("Lokales Auftragslimit erreicht (3 gleichzeitig, 100 gespeichert).");
    db.prepare("INSERT INTO jobs(id,token_hash,source,name,mime,hash,pages,state,model,created,auth_kind,profile_id,prompt_version) VALUES(?,?,?,?,?,?,?,'queued',?,?,?,?,?)").run(input.id, tokenHash(input.token), input.source, input.name, input.mime, hash, input.pages, input.model, new Date().toISOString(), input.authKind ?? "api", input.profileId ?? null, promptVersion);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function claimJob(db: DatabaseSync, dailyLimit: number, authKind: "api" | "chatgpt" = "api"): Job | undefined {
  db.exec("BEGIN IMMEDIATE");
  try {
    // An interrupted request may have been billed. Never silently send it again.
    db.prepare("UPDATE jobs SET state='failed', error='Verarbeitung unterbrochen; Anbieterstatus unklar. Bewusst neu starten.' WHERE state='processing' AND started < ?").run(new Date(Date.now() - 5 * 60000).toISOString());
    const job = db.prepare("SELECT * FROM jobs WHERE state='queued' AND auth_kind=? ORDER BY created LIMIT 1").get(authKind) as Job | undefined;
    if (!job) { db.exec("COMMIT"); return undefined; }
    const day = new Date().toISOString().slice(0, 10);
    db.prepare("INSERT OR IGNORE INTO calls(day,count) VALUES(?,0)").run(day);
    const calls = db.prepare("SELECT count FROM calls WHERE day=?").get(day) as { count: number };
    if (calls.count >= dailyLimit) { db.prepare("UPDATE jobs SET state='failed',error='Tageslimit für Analyseaufrufe erreicht.' WHERE id=?").run(job.id); db.exec("COMMIT"); return undefined; }
    db.prepare("UPDATE calls SET count=count+1 WHERE day=?").run(day);
    db.prepare("UPDATE jobs SET state='processing',started=? WHERE id=?").run(new Date().toISOString(), job.id);
    db.exec("COMMIT"); return job;
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
export function publishResult(db: DatabaseSync, job: Job, value: unknown) {
  const result = validateAnalysis(value, job.pages);
  db.prepare("UPDATE jobs SET state='needs_review',result=? WHERE id=? AND state='processing'").run(JSON.stringify(result), job.id);
}
export function confirmJob(db: DatabaseSync, job: Job, draft: unknown, resolutions: unknown) {
  if (job.state === "confirmed" && job.confirmed) return JSON.parse(job.confirmed);
  if (job.state !== "needs_review" || !job.result) throw new Error("Der Auftrag ist nicht zur Freigabe bereit.");
  const analysis = validateAnalysis(JSON.parse(job.result), job.pages);
  const review = validateReview(draft, analysis, resolutions);
  const d = review.draft;
  const lines = d.ingredients.split("\n").filter((line) => line.trim());
  const steps = d.steps.split("\n").filter((line) => line.trim());
  const equipment = d.equipment.split("\n").filter((line) => line.trim());
  const sourceNotes = (d.notes ?? "").split("\n").filter((line) => line.trim());
  if (lines.length > 100 || steps.length > 200 || equipment.length > 50 || !lines.length || !steps.length) throw new Error("Zu viele oder fehlende Rezeptzeilen.");
  const ingredients = lines.map((line, index) => {
    const fields = line.split("|").map((part) => part.trim());
    if (fields.length !== 3 || !fields[2] || fields[0].length > 60 || fields[1].length > 40 || fields[2].length > 200) throw new Error("Zutaten als Menge | Einheit | Zutat angeben.");
    return { id: `ingredient-${index + 1}`, name: fields[2], amountText: [fields[0], fields[1]].filter(Boolean).join(" ") || "Menge nicht angegeben", quantity: parseQuantity(fields[0]), unit: fields[1] || null, group: "Weitere Zutaten" };
  });
  if (steps.some((step) => step.length > 10000) || equipment.some((item) => item.length > 200) || sourceNotes.length > 100 || sourceNotes.some((note) => note.length > 4000)) throw new Error("Rezeptzeile zu lang.");
  const recipe = {
    id: job.id, title: d.title.trim(), description: "Automatisch übernommen und vom Nutzer geprüft.",
    tags: [], estimatedMinutes: null, servings: d.servings ? Number(d.servings) : null, demo: false,
    ingredients, equipment: equipment.map((name) => ({ name, origin: "source" })),
    steps: steps.map((instruction, index) => ({ title: `Schritt ${index + 1}`, instruction, relatedIngredients: [] })),
    ...(sourceNotes.length ? { sourceNotes } : {}),
    sourceText: d.transcription, sourceName: job.name, sourceType: job.mime, sourceHash: job.hash, createdAt: new Date().toISOString(),
    analysis: { model: job.model, promptVersion: job.prompt_version, blocks: analysis.blocks, issues: analysis.issues, resolutions: review.resolutions, originalTranscription: analysis.blocks.map((block) => block.text).join("\n\n"), ...(analysis.recipe ? { structured: analysis.recipe } : {}) },
  };
  const change = db.prepare("UPDATE jobs SET state='confirmed',confirmed=? WHERE id=? AND state='needs_review'").run(JSON.stringify(recipe), job.id);
  if (change.changes !== 1) throw new Error("Auftrag wurde gleichzeitig verändert. Bitte neu laden.");
  return recipe;
}
