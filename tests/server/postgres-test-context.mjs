import pg from "pg";
import { randomUUID } from "node:crypto";
import { postgresConfig } from "../../apps/web/src/lib/postgres-store.ts";
// Caller must provide a dedicated synthetic test branch. Separate schemas keep
// repeated tests independent; no production objects or test history are deleted.
export async function isolatedPostgresInput() {
  let input="";for await(const chunk of process.stdin)input+=chunk;
  const {connectionString}=JSON.parse(input);input="";
  if (!connectionString) throw new Error("Isolierte Testverbindung fehlt.");
  const schema=`synthetic_${randomUUID().replaceAll("-", "")}`;
  const client=new pg.Client(postgresConfig(connectionString));
  try {await client.connect();await client.query(`CREATE SCHEMA "${schema}"`);} finally {await client.end();}
  const url=new URL(connectionString);url.searchParams.set("options",`-c search_path=${schema}`);
  return url.toString();
}
