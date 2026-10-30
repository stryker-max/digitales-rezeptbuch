import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PoolClient } from "pg";
import { postgresPool } from "../web/src/lib/postgres-store.ts";
import { ownerSession, setupAllowed } from "./owner-auth.ts";
import { authBudget, authInput } from "./auth-input.ts";

const derive = promisify(scrypt);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export type Member = { id: string | null; email: string | null; name: string; role: "owner" | "member" };
const view = (row: Record<string, string>): Member => ({ id: row.id, email: row.email, name: row.name, role: row.role as Member["role"] });
export async function memberFor(request: Request): Promise<Member | null> {
  const token = request.headers.get("x-recipe-session") ?? "", pool = await postgresPool();
  if (ownerSession().verify(token)) {
    const owner = (await pool.query("SELECT id,email,name,role FROM rb_accounts WHERE role='owner' AND active=true")).rows[0];
    return owner ? view(owner) : { id: null, email: null, name: "Mein Konto", role: "owner" };
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = (await pool.query("SELECT a.id,a.email,a.name,a.role FROM rb_sessions s JOIN rb_accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires>$2 AND a.active=true", [hash(token), Date.now()])).rows[0];
  return row ? view(row) : null;
}
export async function accountSession(id: string, client?: PoolClient): Promise<string> {
  const token = randomBytes(32).toString("base64url"), database = client ?? await postgresPool();
  await database.query("DELETE FROM rb_sessions WHERE expires<$1", [Date.now()]);
  await database.query("INSERT INTO rb_sessions(token_hash,account_id,expires) VALUES($1,$2,$3)", [hash(token), id, Date.now() + 30 * 86400000]);
  return token;
}
const fail = (error: string, status = 422, code?: string) => Response.json({ error, ...(code ? { code } : {}) }, { status });
export async function accountRequest(request: Request): Promise<Response> {
  const pool = await postgresPool(), member = await memberFor(request);
  if (request.method === "GET") {
    if (!member) return fail("Bitte anmelden.", 401);
    const members = member.role === "owner" ? (await pool.query("SELECT id,name,email,role FROM rb_accounts WHERE active=true ORDER BY created")).rows : [];
    return Response.json({ user: member, members });
  }
  if (request.method !== "POST") return fail("Methode nicht erlaubt.", 405);
  const input = await authInput(request); if (input instanceof Response) return input;
  const action = String(input.action ?? "");
  if (action === "logout") {
    await pool.query("DELETE FROM rb_sessions WHERE token_hash=$1", [hash(request.headers.get("x-recipe-session") ?? "")]);
    return Response.json({ signedOut: true });
  }
  if (action === "invite" || action === "remove-member") {
    if (!member || member.role !== "owner" || !member.id) return fail("Nur der Inhaber kann Personen einladen oder Zugänge verwalten.", 403);
    if (action === "remove-member") {
      if (typeof input.id !== "string") return fail("Zugang fehlt.");
      const client = await pool.connect();
      try { await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(194729,5)");
        const removed = await client.query("UPDATE rb_accounts SET active=false WHERE id=$1 AND role='member' AND active=true RETURNING id", [input.id]);
        if (!removed.rowCount) { await client.query("ROLLBACK"); return fail("Dieser Zugang ist nicht aktiv.", 404); }
        await client.query("DELETE FROM rb_sessions WHERE account_id=$1", [input.id]);
        await client.query("DELETE FROM rb_passkeys WHERE account_id=$1", [input.id]);
        await client.query("COMMIT"); return Response.json({ removed: true });
      } catch (cause) { await client.query("ROLLBACK").catch(() => {}); throw cause; } finally { client.release(); }
    }
    if ((await pool.query("SELECT id FROM rb_accounts WHERE role='member' AND active=true")).rowCount) return fail("Euer Haushalt hat bereits zwei aktive Konten.", 409);
    const token = randomBytes(32).toString("base64url"), expires = Date.now() + 7 * 86400000;
    await pool.query("UPDATE rb_invites SET used=true WHERE used=false");
    await pool.query("INSERT INTO rb_invites(token_hash,expires) VALUES($1,$2)", [hash(token), expires]);
    return Response.json({ invite: token, expires });
  }
  if (!["login", "register-owner", "join"].includes(action)) return fail("Unbekannte Kontoaktion.");
  const email = typeof input.email === "string" ? input.email.trim().toLocaleLowerCase("en-US") : "";
  const password = input.password;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || !password.length || password.length > 200) return fail("Bitte E-Mail und Passwort eingeben.");
  const setup = request.headers.get("x-recipe-setup") ?? "";
  const invite = typeof input.invite === "string" ? input.invite : "";
  if (action === "register-owner" && !((member?.role === "owner") || setupAllowed(setup))) return fail("Bitte deinen persönlichen Einrichtungslink verwenden.", 403);
  if (action === "join" && !/^[A-Za-z0-9_-]{43}$/.test(invite)) return fail("Bitte den Einladungslink öffnen.", 403);
  const limited = await authBudget(action === "login" ? "password" : "setup"); if (limited) return limited;
  if (action === "login") {
    const row = (await pool.query("SELECT * FROM rb_accounts WHERE email=$1 AND active=true", [email])).rows[0];
    const actual = await derive(password, row?.salt ?? "not-an-account", 64) as Buffer;
    if (!row || !timingSafeEqual(actual, Buffer.from(row.password_hash, "hex"))) return fail("E-Mail oder Passwort stimmen nicht.", 401);
    return Response.json({ session: await accountSession(row.id), user: view(row) });
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 80) return fail("Bitte deinen Namen eingeben.");
  const salt = randomBytes(32).toString("hex"), passwordHash = (await derive(password, salt, 64) as Buffer).toString("hex"), client = await pool.connect();
  try {
    await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(194729,5)");
    if (action === "register-owner") {
      const owner = (await client.query("SELECT * FROM rb_accounts WHERE role='owner'")).rows[0];
      if (owner) {
        const actual = await derive(password, owner.salt, 64) as Buffer;
        if (owner.email === email && owner.active && timingSafeEqual(actual, Buffer.from(owner.password_hash, "hex"))) { const session = await accountSession(owner.id, client); await client.query("COMMIT"); return Response.json({ session, user: view(owner) }); }
        await client.query("ROLLBACK"); return fail("Dein Konto ist bereits angelegt. Bitte anmelden.", 409);
      }
      if ((await client.query("SELECT id FROM rb_owner WHERE id=1")).rowCount && member?.role !== "owner") { await client.query("ROLLBACK"); return fail("Bitte zuerst einmal mit deinem bisherigen Code anmelden.", 409, "LEGACY_LOGIN"); }
      await client.query("INSERT INTO rb_owner(id,salt,password_hash) VALUES(1,$1,$2) ON CONFLICT DO NOTHING", [salt, passwordHash]);
    } else {
      const invitation = (await client.query("SELECT used,expires FROM rb_invites WHERE token_hash=$1 FOR UPDATE", [hash(invite)])).rows[0];
      if (invitation?.used) {
        const joined = (await client.query("SELECT * FROM rb_accounts WHERE email=$1 AND role='member' AND active=true", [email])).rows[0];
        const actual = await derive(password, joined?.salt ?? "not-an-account", 64) as Buffer;
        if (joined && timingSafeEqual(actual, Buffer.from(joined.password_hash, "hex"))) { const session = await accountSession(joined.id, client); await client.query("COMMIT"); return Response.json({ session, user: view(joined) }); }
      }
      if (!invitation || invitation.used || Number(invitation.expires) <= Date.now()) { await client.query("ROLLBACK"); return fail("Diese Einladung wurde bereits verwendet oder ist abgelaufen.", 403); }
      if ((await client.query("SELECT id FROM rb_accounts WHERE role='member' AND active=true")).rowCount) { await client.query("ROLLBACK"); return fail("Euer Haushalt ist bereits zu zweit.", 409); }
    }
    const duplicate = (await client.query("SELECT id,active,role FROM rb_accounts WHERE email=$1", [email])).rows[0];
    if (duplicate?.active || duplicate?.role === "owner") { await client.query("ROLLBACK"); return fail("Für diese E-Mail besteht bereits ein Konto. Bitte anmelden.", 409); }
    const id = duplicate?.id ?? randomUUID(), role = action === "register-owner" ? "owner" : "member";
    await client.query("INSERT INTO rb_accounts(id,email,name,role,salt,password_hash,created) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,salt=EXCLUDED.salt,password_hash=EXCLUDED.password_hash,active=true", [id, email, name, role, salt, passwordHash, Date.now()]);
    if (action === "register-owner") await client.query("UPDATE rb_passkeys SET account_id=$1 WHERE account_id IS NULL", [id]);
    else await client.query("UPDATE rb_invites SET used=true WHERE token_hash=$1", [hash(invite)]);
    const session = await accountSession(id, client);
    await client.query("COMMIT"); return Response.json({ session, user: { id, email, name, role } });
  } catch (cause) { await client.query("ROLLBACK").catch(() => {}); throw cause; } finally { client.release(); }
}
