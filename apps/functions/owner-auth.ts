import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { postgresPool } from "../web/src/lib/postgres-store.ts";
import { privateHost } from "../web/src/lib/private-host.ts";
import { authBudget, authInput } from "./auth-input.ts";

const derive = promisify(scrypt);
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
export const sameSecret = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
export function ownerSession() { return privateHost(process.env.RECIPE_SESSION_KEY ?? "", process.env.RECIPE_APP_ORIGIN ?? ""); }
function setupAllowed(provided: string) {
  const expected = process.env.RECIPE_SETUP_HASH ?? "";
  return /^[A-Za-z0-9_-]{43}$/.test(provided) && /^[0-9a-f]{64}$/.test(expected) && sameSecret(digest(provided), expected);
}
export async function signInOwner(request: Request): Promise<Response> {
  const json = (error: string, status: number, code?: string) => Response.json({ error, ...(code ? { code } : {}) }, { status });
  if (request.method === "GET") {
    const pool = await postgresPool();
    const configured = Boolean((await pool.query("SELECT id FROM rb_owner WHERE id=1")).rowCount);
    const provided = request.headers.get("x-recipe-setup");
    return Response.json({ configured, ...(provided ? { setupValid: setupAllowed(provided) } : {}) });
  }
  if (request.method !== "POST") return json("Anmeldung erforderlich.", 401);
  const setup = new URL(request.url).searchParams.get("setup") === "1";
  if (setup) {
    if (!setupAllowed(request.headers.get("x-recipe-setup") ?? "")) return json("Dieser Einrichtungslink ist ungültig. Bitte deinen persönlichen Einrichtungslink öffnen.", 403, "SETUP_INVALID");
  }
  const input = await authInput(request); if (input instanceof Response) return input;
  const password = input.password;
  if (typeof password !== "string" || !password.length || password.length > 200) return json("Bitte einen Code oder ein Passwort eingeben.", 422);
  const pool = await postgresPool();
  const existing = !setup ? (await pool.query("SELECT salt,password_hash FROM rb_owner WHERE id=1")).rows[0] : undefined;
  if (!setup && !existing) return json("Dein Zugang ist noch nicht eingerichtet. Öffne zuerst deinen persönlichen Einrichtungslink und lege dort deinen Code fest.", 409, "SETUP_REQUIRED");
  const limited = await authBudget(setup ? "setup" : "password"); if (limited) return limited;
  if (setup) {
    const salt = randomBytes(32).toString("hex"), hash = (await derive(password, salt, 64) as Buffer).toString("hex");
    const inserted = await pool.query("INSERT INTO rb_owner(id,salt,password_hash) VALUES(1,$1,$2) ON CONFLICT DO NOTHING", [salt, hash]);
    if (inserted.rowCount !== 1) {
      // A lost successful response must not make the same owner setup fail on retry.
      const row = (await pool.query("SELECT salt,password_hash FROM rb_owner WHERE id=1")).rows[0];
      const actual = await derive(password, row.salt, 64) as Buffer;
      if (!timingSafeEqual(actual, Buffer.from(row.password_hash, "hex"))) return json("Dein Zugang ist bereits eingerichtet. Bitte mit deinem bestehenden Code oder Passwort anmelden.", 409, "ALREADY_CONFIGURED");
    }
  } else {
    const actual = await derive(password, existing.salt, 64) as Buffer;
    if (!timingSafeEqual(actual, Buffer.from(existing.password_hash, "hex"))) return json("Code oder Passwort stimmen nicht. Bitte erneut versuchen.", 401);
  }
  return Response.json({ session: ownerSession().issue() });
}
