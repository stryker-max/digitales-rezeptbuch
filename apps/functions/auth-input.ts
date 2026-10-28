import { postgresPool } from "../web/src/lib/postgres-store.ts";

export async function authInput(request: Request, limit = 4096): Promise<Record<string, unknown> | Response> {
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return Response.json({ error: "Ungültiges Anmeldeformat." }, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Anmeldung fehlt." }, { status: 422 });
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > limit) { await reader.cancel(); return Response.json({ error: "Anmeldung zu groß." }, { status: 413 }); } chunks.push(item.value); }
  try { const data = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (data && typeof data === "object" && !Array.isArray(data)) return data; } catch { /* No request content in errors/logs. */ }
  return Response.json({ error: "Ungültige Anmeldung." }, { status: 422 });
}

// Shared across server instances. Sustained limits also protect short owner codes.
// Passkeys have a separate budget, so a password lock does not lock out Face ID.
export async function authBudget(kind: "password" | "passkey"): Promise<Response | undefined> {
  const pool = await postgresPool(), client = await pool.connect(), now = Date.now();
  const windows = kind === "password" ? [[60000, 5], [3600000, 20], [86400000, 100]] : [[60000, 30], [86400000, 1000]];
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM rb_auth_limits WHERE expires < $1", [now]);
    for (const [duration, limit] of windows) {
      const bucket = `${kind}:${duration}:${Math.floor(now / duration)}`, expires = (Math.floor(now / duration) + 1) * duration;
      const count = (await client.query("INSERT INTO rb_auth_limits(bucket,attempts,expires) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET attempts=LEAST(rb_auth_limits.attempts+1,1000000) RETURNING attempts", [bucket, expires])).rows[0].attempts;
      if (count > limit) { await client.query("COMMIT"); return Response.json({ error: "Zu viele Versuche. Bitte später erneut versuchen oder einen eingerichteten Passkey verwenden." }, { status: 429, headers: { "Retry-After": String(Math.ceil((expires - now) / 1000)) } }); }
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}
