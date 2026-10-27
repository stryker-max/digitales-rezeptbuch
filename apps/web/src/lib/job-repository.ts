import { openJobs, authorize, enqueue, claimJob, publishResult, confirmJob, type Job } from "./analysis-server.ts";
export type JobInput = Parameters<typeof enqueue>[1];
export type ConfirmedSource = { confirmed: string; source: Uint8Array; mime: string };
export interface JobRepository {
  authorize(id: string, token: string, withSource?: boolean): Promise<Job | undefined>;
  enqueue(input: JobInput): Promise<void>;
  claim(limit: number, provider?: "api" | "chatgpt"): Promise<Job | undefined>;
  publish(job: Job, value: unknown): Promise<void>;
  confirm(job: Job, draft: unknown, resolutions: unknown): Promise<unknown>;
  cancel(id: string): Promise<void>;
  fail(id: string, message: string): Promise<void>;
  listConfirmed(): Promise<string[]>;
  confirmedSource(id: string): Promise<ConfirmedSource | undefined>;
  close(): Promise<void>;
}
export async function openJobRepository(): Promise<JobRepository> {
  if (process.env.RECIPE_DATABASE_URL) {
    const { postgresPool, PostgresJobs } = await import("./postgres-store.ts");
    return new PostgresJobs(await postgresPool());
  }
  const db = openJobs();
  return {
    async authorize(id, token) { return authorize(db, id, token); },
    async enqueue(input) { enqueue(db, input); },
    async claim(limit, provider = "api") { return claimJob(db, limit, provider); },
    async publish(job, value) { publishResult(db, job, value); },
    async confirm(job, draft, resolutions) { return confirmJob(db, job, draft, resolutions); },
    async cancel(id) { db.prepare("UPDATE jobs SET state='cancelled' WHERE id=? AND state IN ('queued','processing','needs_review')").run(id); },
    async fail(id, message) { db.prepare("UPDATE jobs SET state='failed',error=? WHERE id=? AND state='processing'").run(message, id); },
    async listConfirmed() { return (db.prepare("SELECT confirmed FROM jobs WHERE state='confirmed' AND confirmed IS NOT NULL ORDER BY created DESC LIMIT 100").all() as { confirmed: string }[]).map(row => row.confirmed); },
    async confirmedSource(id) { return db.prepare("SELECT confirmed,source,mime FROM jobs WHERE id=? AND state='confirmed' AND confirmed IS NOT NULL").get(id) as ConfirmedSource | undefined; },
    async close() { db.close(); },
  };
}
