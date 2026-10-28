import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { postgresPool } from "../web/src/lib/postgres-store.ts";
import { privateHost } from "../web/src/lib/private-host.ts";

const derive = promisify(scrypt);
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
export const sameSecret = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
export function ownerSession() { return privateHost(process.env.RECIPE_SESSION_KEY ?? "", process.env.RECIPE_APP_ORIGIN ?? ""); }
export async function signInOwner(request: Request): Promise<Response> {
  const json = (error: string, status: number) => Response.json({ error }, { status });
  if (request.method !== "POST") return json("Anmeldung erforderlich.", 401);
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) return json("Ungültiges Anmeldeformat.", 415);
  const setup = new URL(request.url).searchParams.get("setup") === "1";
  if (setup) {
    const provided = request.headers.get("x-recipe-setup") ?? "", expected = process.env.RECIPE_SETUP_HASH ?? "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(provided) || !/^[0-9a-f]{64}$/.test(expected) || !sameSecret(digest(provided), expected)) return json("Einrichtungsfreigabe fehlt oder ist ungültig.", 403);
  }
  const chunks: Uint8Array[] = []; const reader = request.body?.getReader();
  if (!reader) return json("Passwort fehlt.", 422);
  let size = 0;
  while (true) { const item = await reader.read(); if (item.done) break; size += item.value.length; if (size > 4096) { await reader.cancel(); return json("Anmeldung zu groß.", 413); } chunks.push(item.value); }
  let password: unknown; try { password = JSON.parse(Buffer.concat(chunks).toString("utf8")).password; } catch { return json("Ungültige Anmeldung.", 422); }
  if (typeof password !== "string" || password.length < 20 || password.length > 200) return json("Passwort benötigt 20 bis 200 Zeichen.", 422);
  const pool = await postgresPool();
  // Shared global brute-force budget, not an ingress/DDoS filter.
  const bucket = String(Math.floor(Date.now() / 60000));
  const count = (await pool.query("INSERT INTO rb_login_limits(bucket,attempts) VALUES($1,1) ON CONFLICT(bucket) DO UPDATE SET attempts=rb_login_limits.attempts+1 RETURNING attempts", [bucket])).rows[0].attempts;
  if (count > 20) return Response.json({ error: "Zu viele Anmeldeversuche. Bitte kurz warten." }, { status: 429, headers: { "Retry-After": "60" } });
  if (setup) {
    const salt = randomBytes(32).toString("hex"), hash = (await derive(password, salt, 64) as Buffer).toString("hex");
    const inserted = await pool.query("INSERT INTO rb_owner(id,salt,password_hash) VALUES(1,$1,$2) ON CONFLICT DO NOTHING", [salt, hash]);
    if (inserted.rowCount !== 1) return json("Bereits eingerichtet. Bitte mit deinem bestehenden Passwort anmelden.", 409);
  } else {
    const row = (await pool.query("SELECT salt,password_hash FROM rb_owner WHERE id=1")).rows[0];
    const actual = await derive(password, row?.salt ?? "unconfigured-owner", 64) as Buffer;
    if (!row || !timingSafeEqual(actual, Buffer.from(row.password_hash, "hex"))) return json("Passwort stimmt nicht oder Einrichtung fehlt.", 401);
  }
  return Response.json({ session: ownerSession().issue() });
}
