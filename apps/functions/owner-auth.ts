import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { postgresPool } from "../web/src/lib/postgres-store.ts";
import { privateHost } from "../web/src/lib/private-host.ts";
import { authBudget, authInput } from "./auth-input.ts";

const derive = promisify(scrypt);
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
export const sameSecret = (a: string, b: string) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
export function ownerSession() { return privateHost(process.env.RECIPE_SESSION_KEY ?? "", process.env.RECIPE_APP_ORIGIN ?? ""); }
export async function signInOwner(request: Request): Promise<Response> {
  const json = (error: string, status: number) => Response.json({ error }, { status });
  if (request.method !== "POST") return json("Anmeldung erforderlich.", 401);
  const setup = new URL(request.url).searchParams.get("setup") === "1";
  if (setup) {
    const provided = request.headers.get("x-recipe-setup") ?? "", expected = process.env.RECIPE_SETUP_HASH ?? "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(provided) || !/^[0-9a-f]{64}$/.test(expected) || !sameSecret(digest(provided), expected)) return json("Einrichtungsfreigabe fehlt oder ist ungültig.", 403);
  }
  const input = await authInput(request); if (input instanceof Response) return input;
  const password = input.password;
  if (typeof password !== "string" || !password.length || password.length > 200) return json("Bitte einen Code oder ein Passwort eingeben.", 422);
  const limited = await authBudget("password"); if (limited) return limited;
  const pool = await postgresPool();
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
