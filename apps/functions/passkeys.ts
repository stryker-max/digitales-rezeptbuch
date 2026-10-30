import { createHash, randomUUID } from "node:crypto";
import { generateRegistrationOptions, generateAuthenticationOptions, verifyRegistrationResponse, verifyAuthenticationResponse, type RegistrationResponseJSON, type AuthenticationResponseJSON, type AuthenticatorTransport } from "@simplewebauthn/server";
import { postgresPool } from "../web/src/lib/postgres-store.ts";
import { ownerSession } from "./owner-auth.ts";
import { authBudget, authInput } from "./auth-input.ts";
import { memberFor, accountSession } from "./accounts.ts";

export async function passkeyRequest(request: Request): Promise<Response> {
  const error = (text: string, status = 422) => Response.json({ error: text }, { status });
  if (request.method !== "POST") return error("Methode nicht erlaubt.", 405);
  const input = await authInput(request, 65536); if (input instanceof Response) return input;
  const { action } = input;
  if (!["register-options", "register-verify", "login-options", "login-verify"].includes(String(action))) return error("Unbekannte Passkey-Aktion.");
  const registering = String(action).startsWith("register-"), session = request.headers.get("x-recipe-session") ?? "";
  const member = registering ? await memberFor(request) : null;
  if (registering && !member) return error("Bitte zuerst anmelden.", 401);
  const limited = await authBudget("passkey"); if (limited) return limited;
  const pool = await postgresPool(), origin = process.env.RECIPE_APP_ORIGIN!, rpID = new URL(origin).hostname;
  const binding = registering ? createHash("sha256").update(session).digest("hex") : "";
  if (registering && !(await pool.query("SELECT id FROM rb_owner WHERE id=1")).rowCount) return error("Bitte zuerst deinen eigenen Code festlegen.", 409);
  await pool.query("DELETE FROM rb_auth_challenges WHERE expires < $1", [Date.now()]);
  if (String(action).endsWith("options")) {
    let options;
    if (registering) {
      const keys = (await pool.query("SELECT id,transports FROM rb_passkeys WHERE account_id IS NOT DISTINCT FROM $1", [member!.id])).rows;
      if (keys.length >= 10) return error("Es sind bereits zehn Passkeys eingerichtet.", 409);
      options = await generateRegistrationOptions({ rpName: "Digitales Rezeptbuch", rpID, userID: new TextEncoder().encode(member!.id ?? "digitales-rezeptbuch-owner"), userName: member!.email ?? "Mein Rezeptbuch", attestationType: "none", supportedAlgorithmIDs: [-7, -257], authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" }, excludeCredentials: keys.map(key => ({ id: key.id, transports: key.transports })) });
    } else {
      // Discoverable credentials: no public list of the owner's credential IDs.
      options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    }
    const challengeId = randomUUID();
    await pool.query("INSERT INTO rb_auth_challenges(id,challenge,kind,binding,expires) VALUES($1,$2,$3,$4,$5)", [challengeId, options.challenge, registering ? "register" : "login", binding, Date.now() + 300000]);
    return Response.json({ challengeId, options });
  }
  if (typeof input.challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.challengeId) || !input.credential || typeof input.credential !== "object") return error("Ungültige Passkey-Antwort.");
  // Atomic consumption BEFORE verification: concurrent replies/replays cannot reuse a challenge.
  const challenge = (await pool.query("DELETE FROM rb_auth_challenges WHERE id=$1 AND kind=$2 AND binding=$3 AND expires>$4 RETURNING challenge", [input.challengeId, registering ? "register" : "login", binding, Date.now()])).rows[0]?.challenge;
  if (!challenge) return error("Passkey-Anfrage abgelaufen. Bitte erneut versuchen.");
  try {
    if (registering) {
      const verification = await verifyRegistrationResponse({ response: input.credential as RegistrationResponseJSON, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] });
      if (!verification.verified || !verification.registrationInfo) return error("Passkey konnte nicht bestätigt werden.");
      const { credential } = verification.registrationInfo, client = await pool.connect();
      try {
        await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(194729,4)");
        if (Number((await client.query("SELECT COUNT(*) AS count FROM rb_passkeys WHERE account_id IS NOT DISTINCT FROM $1", [member!.id])).rows[0].count) >= 10) { await client.query("ROLLBACK"); return error("Es sind bereits zehn Passkeys eingerichtet.", 409); }
        if (member!.id && !(await client.query("SELECT id FROM rb_accounts WHERE id=$1 AND active=true", [member!.id])).rowCount) { await client.query("ROLLBACK"); return error("Dieser Zugang ist nicht mehr aktiv.", 401); }
        await client.query("INSERT INTO rb_passkeys(id,public_key,counter,transports,created,account_id) VALUES($1,$2,$3,$4,$5,$6)", [credential.id, Buffer.from(credential.publicKey), credential.counter, JSON.stringify(credential.transports ?? []), Date.now(), member!.id]);
        await client.query("COMMIT");
      } catch (cause) { await client.query("ROLLBACK").catch(() => {}); throw cause; } finally { client.release(); }
      return Response.json({ registered: true });
    }
    const response = input.credential as AuthenticationResponseJSON;
    if (typeof response.id !== "string" || response.id.length > 2048) return error("Unbekannter Passkey.");
    const row = (await pool.query("SELECT p.* FROM rb_passkeys p LEFT JOIN rb_accounts a ON a.id=p.account_id WHERE p.id=$1 AND (p.account_id IS NULL OR a.active=true)", [response.id])).rows[0];
    if (!row) return error("Dieser Passkey gehört nicht zu deinem Rezeptbuch.", 401);
    const verification = await verifyAuthenticationResponse({ response, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, credential: { id: row.id, publicKey: new Uint8Array(row.public_key), counter: Number(row.counter), transports: row.transports as AuthenticatorTransport[] } });
    if (!verification.verified) return error("Passkey konnte nicht bestätigt werden.", 401);
    const updated = await pool.query("UPDATE rb_passkeys SET counter=$1 WHERE id=$2 AND counter=$3", [verification.authenticationInfo.newCounter, row.id, row.counter]);
    if (updated.rowCount !== 1) return error("Gleichzeitige Anmeldung. Bitte erneut versuchen.", 409);
    return Response.json({ session: row.account_id ? await accountSession(row.account_id) : ownerSession().issue() });
  } catch { return error("Passkey konnte nicht bestätigt werden. Bitte erneut versuchen."); }
}
