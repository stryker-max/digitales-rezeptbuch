import pg, { type Pool, type PoolClient } from "pg";
import { createHash } from "node:crypto";
import { tokenHash, reviewedRecipe, type Job } from "./analysis-server.ts";
import { validateAnalysis, promptVersion } from "./analysis-contract.ts";
import { postgresSchemaV1, postgresSchemaV2, postgresSchemaV3, postgresSchemaV4 } from "./postgres-schema.ts";
import type { ConfirmedSource, JobInput, JobRepository } from "./job-repository.ts";

export function postgresConfig(connectionString: string) {
  let url: URL;
  try { url = new URL(connectionString); } catch { throw new Error("Ungültige private Datenbankverbindung."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.username || !url.password || /-pooler\./.test(url.hostname)) throw new Error("Eine direkte private PostgreSQL-Verbindung ohne Pooler ist erforderlich.");
  // Never let URL parameters replace certificate verification. Session locks need
  // a direct connection, not a transaction-pooling endpoint.
  for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert", "sslnegotiation"]) url.searchParams.delete(key);
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: true }, max: 3, connectionTimeoutMillis: 15000, idleTimeoutMillis: 10000, allowExitOnIdle: true, application_name: "digitales-rezeptbuch" };
}
const globalState = globalThis as typeof globalThis & { recipePostgres?: { pool: Pool; ready: Promise<Pool> } };
export async function postgresPool(): Promise<Pool> {
  if (!globalState.recipePostgres) {
    const pool = new pg.Pool(postgresConfig(process.env.RECIPE_DATABASE_URL ?? ""));
    pool.on("error", () => { /* Reconnect on the next request after free-tier suspension. */ });
    const ready = (async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(194729,3)");
        await client.query("CREATE TABLE IF NOT EXISTS rb_schema_migrations(version INTEGER PRIMARY KEY)");
        if (!(await client.query("SELECT version FROM rb_schema_migrations WHERE version=1")).rowCount) {
          await client.query(postgresSchemaV1);
          await client.query("INSERT INTO rb_schema_migrations(version) VALUES(1)");
        }
        if (!(await client.query("SELECT version FROM rb_schema_migrations WHERE version=2")).rowCount) {
          await client.query(postgresSchemaV2); await client.query("INSERT INTO rb_schema_migrations(version) VALUES(2)");
        }
        if (!(await client.query("SELECT version FROM rb_schema_migrations WHERE version=3")).rowCount) {
          await client.query(postgresSchemaV3); await client.query("INSERT INTO rb_schema_migrations(version) VALUES(3)");
        }
        if (!(await client.query("SELECT version FROM rb_schema_migrations WHERE version=4")).rowCount) {
          await client.query(postgresSchemaV4); await client.query("INSERT INTO rb_schema_migrations(version) VALUES(4)");
        }
        await client.query("COMMIT"); return pool;
      } catch { await client.query("ROLLBACK").catch(() => {}); throw new Error("Private Datenbank konnte nicht eingerichtet werden."); }
      finally { client.release(); }
    })();
    globalState.recipePostgres = { pool, ready };
    ready.catch(() => { if (globalState.recipePostgres?.pool === pool) delete globalState.recipePostgres; void pool.end(); });
  }
  return globalState.recipePostgres.ready;
}
const metadataColumns = "id,token_hash,name,mime,hash,pages,state,result,error,model,created,started,confirmed,auth_kind,profile_id,prompt_version";
async function transaction<T>(pool: Pool, operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query("BEGIN"); const result = await operation(client); await client.query("COMMIT"); return result; }
  catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}
export class PostgresJobs implements JobRepository {
  readonly pool: Pool; constructor(pool: Pool) { this.pool = pool; }
  async authorize(id: string, token: string, withSource = false): Promise<Job | undefined> {
    if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(token)) return undefined;
    const row = (await this.pool.query(`SELECT ${metadataColumns}${withSource ? ",source" : ""} FROM rb_jobs WHERE id=$1 AND token_hash=$2`, [id, tokenHash(token)])).rows[0];
    // Status polling must not download the original from the database each time.
    return row ? { ...row, source: withSource ? row.source : new Uint8Array() } : undefined;
  }
  async enqueue(input: JobInput): Promise<void> {
    await transaction(this.pool, async client => {
      await client.query("SELECT pg_advisory_xact_lock(194729,1)");
      const hash = createHash("sha256").update(input.source).digest("hex");
      const existing = (await client.query("SELECT hash,token_hash,model,auth_kind,profile_id FROM rb_jobs WHERE id=$1", [input.id])).rows[0];
      if (existing) {
        if (existing.hash !== hash || existing.token_hash !== tokenHash(input.token) || existing.model !== input.model || existing.auth_kind !== (input.authKind ?? "api") || existing.profile_id !== (input.profileId ?? null)) throw new Error("Auftragskonflikt.");
        return;
      }
      const counts = (await client.query("SELECT COUNT(*) AS total,COUNT(*) FILTER(WHERE state IN ('queued','processing')) AS pending,COALESCE(SUM(octet_length(source)),0) AS bytes FROM rb_jobs")).rows[0];
      if (Number(counts.pending) >= 3 || Number(counts.total) >= 100) throw new Error("Auftragslimit erreicht (3 gleichzeitig, 100 gespeichert).");
      if (Number(counts.bytes) + input.source.byteLength > 200 * 1024 * 1024) throw new Error("Original-Speicherlimit der kostenlosen Version erreicht (200 MB). Sammlung sichern; kein automatisches Upgrade.");
      await client.query("INSERT INTO rb_jobs(id,token_hash,source,name,mime,hash,pages,state,model,created,auth_kind,profile_id,prompt_version) VALUES($1,$2,$3,$4,$5,$6,$7,'queued',$8,$9,$10,$11,$12)", [input.id, tokenHash(input.token), Buffer.from(input.source), input.name, input.mime, hash, input.pages, input.model, new Date().toISOString(), input.authKind ?? "api", input.profileId ?? null, promptVersion]);
    });
  }
  async claim(limit: number, provider: "api" | "chatgpt" = "api"): Promise<Job | undefined> {
    return transaction(this.pool, async client => {
      await client.query("SELECT pg_advisory_xact_lock(194729,1)");
      await client.query("UPDATE rb_jobs SET state='failed',error='Verarbeitung unterbrochen; Anbieterstatus unklar. Bewusst neu starten.' WHERE state='processing' AND started < $1", [new Date(Date.now() - 5 * 60000).toISOString()]);
      const job = (await client.query("SELECT * FROM rb_jobs WHERE state='queued' AND auth_kind=$1 ORDER BY created LIMIT 1 FOR UPDATE", [provider])).rows[0] as Job | undefined;
      if (!job) return undefined;
      const day = new Date().toISOString().slice(0, 10);
      await client.query("INSERT INTO rb_calls(day,count) VALUES($1,0) ON CONFLICT DO NOTHING", [day]);
      const calls = (await client.query("SELECT count FROM rb_calls WHERE day=$1 FOR UPDATE", [day])).rows[0];
      if (calls.count >= limit) { await client.query("UPDATE rb_jobs SET state='failed',error='Tageslimit für Analyseaufrufe erreicht.' WHERE id=$1", [job.id]); return undefined; }
      await client.query("UPDATE rb_calls SET count=count+1 WHERE day=$1", [day]);
      await client.query("UPDATE rb_jobs SET state='processing',started=$1 WHERE id=$2", [new Date().toISOString(), job.id]);
      return job;
    });
  }
  async publish(job: Job, value: unknown) {
    const analysis = validateAnalysis(value, job.pages);
    await this.pool.query("UPDATE rb_jobs SET state='needs_review',result=$1 WHERE id=$2 AND state='processing'", [JSON.stringify(analysis), job.id]);
  }
  async confirm(job: Job, draft: unknown, resolutions: unknown) {
    return transaction(this.pool, async client => {
      const current = (await client.query(`SELECT ${metadataColumns} FROM rb_jobs WHERE id=$1 AND token_hash=$2 FOR UPDATE`, [job.id, job.token_hash])).rows[0] as Job | undefined;
      if (!current) throw new Error("Auftrag nicht gefunden.");
      if (current.state === "confirmed" && current.confirmed) return JSON.parse(current.confirmed);
      const recipe = reviewedRecipe(current, draft, resolutions);
      await client.query("UPDATE rb_jobs SET state='confirmed',confirmed=$1 WHERE id=$2 AND state='needs_review'", [JSON.stringify(recipe), job.id]);
      return recipe;
    });
  }
  async cancel(id: string) { await this.pool.query("UPDATE rb_jobs SET state='cancelled' WHERE id=$1 AND state IN ('queued','processing','needs_review')", [id]); }
  async fail(id: string, message: string) { await this.pool.query("UPDATE rb_jobs SET state='failed',error=$1 WHERE id=$2 AND state='processing'", [message, id]); }
  async listConfirmed(): Promise<string[]> { return (await this.pool.query("SELECT confirmed FROM rb_jobs WHERE state='confirmed' AND confirmed IS NOT NULL ORDER BY created DESC LIMIT 100")).rows.map(row => row.confirmed); }
  async confirmedSource(id: string): Promise<ConfirmedSource | undefined> { return (await this.pool.query("SELECT confirmed,source,mime FROM rb_jobs WHERE id=$1 AND state='confirmed' AND confirmed IS NOT NULL", [id])).rows[0]; }
  async close() { /* Shared bounded pool is reused by this process. */ }
}
