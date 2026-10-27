import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { isAbsolute, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createPrivateGateway } from "./private-gateway.mjs";
import { importServerBootstrap } from "./server-bootstrap.mjs";
const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT ?? "10000"), targetPort = 3135;
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === targetPort) throw new Error("Ungültiger Serverport.");
if (!process.env.RECIPE_DATABASE_URL && (!process.env.RECIPE_PRIVATE_DATA_DIR || !isAbsolute(process.env.RECIPE_PRIVATE_DATA_DIR))) throw new Error("Privaten dauerhaften Datenträger einrichten.");
const directory = resolve(process.env.RECIPE_PRIVATE_DATA_DIR ?? `${tmpdir()}/digitales-rezeptbuch`);
const env = { ...process.env, ANALYSIS_AUTH_MODE: "chatgpt", LOCAL_ANALYSIS_ENABLED: "true", RECIPE_PRIVATE_SERVER: "true", RECIPE_INTERNAL_TOKEN: randomBytes(32).toString("base64url"), OPENAI_API_KEY: "", OPENAI_MODEL: "", RECIPE_DATA_DIR: resolve(directory, "analysis"), RECIPE_CHATGPT_DIR: resolve(directory, "chatgpt"), ANALYSIS_DAILY_CALL_LIMIT: process.env.ANALYSIS_DAILY_CALL_LIMIT ?? "20" };
const gateway = createPrivateGateway({ origin: env.RECIPE_PUBLIC_ORIGIN ?? env.RENDER_EXTERNAL_URL, password: env.RECIPE_OWNER_PASSWORD, sessionKey: env.RECIPE_SESSION_KEY, internalToken: env.RECIPE_INTERNAL_TOKEN, targetPort });
if (env.RECIPE_DATABASE_URL) {
  // Bootstrap modules read only the validated server environment.
  Object.assign(process.env, env);
  const { importPostgresBootstrap } = await import("../apps/web/src/lib/postgres-profiles.ts");
  await importPostgresBootstrap(env.RECIPE_CREDENTIAL_KEY ?? "", env.RECIPE_CHATGPT_BOOTSTRAP);
} else await importServerBootstrap(env.RECIPE_CHATGPT_DIR, env.RECIPE_CREDENTIAL_KEY ?? "", env.RECIPE_CHATGPT_BOOTSTRAP);
// Bootstrap is one-time setup; do not keep its stale credential copy in children.
delete env.RECIPE_CHATGPT_BOOTSTRAP; delete process.env.RECIPE_CHATGPT_BOOTSTRAP;
delete env.RECIPE_OWNER_PASSWORD; delete env.RECIPE_SESSION_KEY;
const children = [
  spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(targetPort)], { cwd: resolve(root, "apps/web"), env, stdio: ["inherit", "inherit", "inherit", "ipc"], windowsHide: true }),
  spawn(process.execPath, ["--experimental-strip-types", resolve(root, "apps/worker/abo-worker.ts")], { cwd: root, env, stdio: ["inherit", "inherit", "inherit", "ipc"], windowsHide: true }),
];
children[0].on("message", message => { if (message?.type === "recipe-job-enqueued" && children[1].connected) children[1].send(message, () => {}); });
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; gateway.close(); for (const child of children) { if (child.connected) child.disconnect(); child.kill(); } process.exitCode = code; }
for (const child of children) { child.on("error", () => stop(1)); child.on("exit", code => stop(code ?? 0)); }
process.on("SIGINT", () => stop()); process.on("SIGTERM", () => stop());
for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
  try { if ((await fetch(`http://127.0.0.1:${targetPort}/`, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* Wait for the private upstream. */ }
  if (attempt === 59) { stop(1); throw new Error("Privater Webserver nicht bereit."); }
  await new Promise(done => setTimeout(done, 1000));
}
if (!stopping) gateway.listen(port, "0.0.0.0", () => console.log("Privates Rezeptbuch mit Anmeldung und Abo-Worker bereit. Keine Zugangsdaten im Protokoll."));
