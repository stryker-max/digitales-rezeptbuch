import { postgresPool } from "../web/src/lib/postgres-store.ts";
import { emptyHousehold, mergeHousehold, parseHousehold } from "../web/src/lib/household.ts";
import { authInput } from "./auth-input.ts";

// Reached only after active household membership is checked by the API router.
export async function householdRequest(request: Request): Promise<Response> {
  const pool = await postgresPool();
  if (request.method === "GET") {
    const row = (await pool.query("SELECT version,state FROM rb_household WHERE id=1")).rows[0];
    return Response.json(row ?? { version: 0, state: null });
  }
  const input = await authInput(request, 262144); if (input instanceof Response) return input;
  const next = parseHousehold(input.state), version = input.version;
  if (!next || !Number.isInteger(version) || Number(version) < 0 || Number(version) > 2147483000) return Response.json({ error: "Plan oder Einkaufsliste sind ungültig." }, { status: 422 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(194729,6)");
    const current = (await client.query("SELECT version,state FROM rb_household WHERE id=1 FOR UPDATE")).rows[0] ?? { version: 0, state: emptyHousehold() };
    let state = next;
    if (version !== current.version) {
      const before = version === 0 ? emptyHousehold() : (await client.query("SELECT state FROM rb_household_history WHERE version=$1", [version])).rows[0]?.state;
      const merged = before ? mergeHousehold(before, next, current.state) : { state: current.state, conflicts: ["Ältere Änderungen"] };
      if (merged.conflicts.length) { await client.query("ROLLBACK"); return Response.json({ ...current, conflicts: merged.conflicts, error: "Ihr habt denselben Eintrag geändert. Bitte wähle den gewünschten Stand; deine Änderungen bleiben erhalten." }, { status: 409 }); }
      state = merged.state;
    }
    const updated = current.version + 1;
    await client.query("INSERT INTO rb_household(id,version,state) VALUES(1,$1,$2) ON CONFLICT(id) DO UPDATE SET version=EXCLUDED.version,state=EXCLUDED.state", [updated, JSON.stringify(state)]);
    await client.query("INSERT INTO rb_household_history(version,state) VALUES($1,$2)", [updated, JSON.stringify(state)]);
    await client.query("DELETE FROM rb_household_history WHERE version<$1", [updated - 100]);
    await client.query("COMMIT"); return Response.json({ version: updated, state });
  } catch (cause) { await client.query("ROLLBACK").catch(() => {}); throw cause; } finally { client.release(); }
}
