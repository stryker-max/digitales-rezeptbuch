import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
const root = resolve(import.meta.dirname, "..");
if (process.platform !== "win32") throw new Error("Der lokale Abo-Starter verwendet Windows-DPAPI und benötigt Windows.");
if (!existsSync(resolve(root, "packages/chatgpt-local/dist/index.js"))) throw new Error("Zuerst npm ci ausführen.");
const port = process.env.RECIPE_ABO_PORT ?? "3125";
if (!/^\d{4,5}$/.test(port) || Number(port) > 65535) throw new Error("Ungültiger lokaler Port.");
const production = process.argv.includes("--production");
if (production && !existsSync(resolve(root, "apps/web/.next/BUILD_ID"))) throw new Error("Zuerst npm run build ausführen.");
const env = { ...process.env, ANALYSIS_AUTH_MODE: "chatgpt", LOCAL_ANALYSIS_ENABLED: "true", OPENAI_API_KEY: "", OPENAI_MODEL: "", RECIPE_CHATGPT_DIR: resolve(root, "private/chatgpt-abo"), RECIPE_DATA_DIR: resolve(root, "private/analysis-abo"), ANALYSIS_DAILY_CALL_LIMIT: process.env.ANALYSIS_DAILY_CALL_LIMIT ?? "20" };
const children = [
  spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), production ? "start" : "dev", ...(production ? [] : ["--webpack"]), "--hostname", "127.0.0.1", "--port", port], { cwd: resolve(root, "apps/web"), env, stdio: "inherit", windowsHide: true }),
  spawn(process.execPath, ["--experimental-strip-types", resolve(root, "apps/worker/abo-worker.ts")], { cwd: root, env, stdio: "inherit", windowsHide: true }),
];
console.log(`Lokales Digitales Rezeptbuch mit ChatGPT-Abo: http://127.0.0.1:${port}`);
console.log("Der Rechner muss für Anmeldung und Analyse eingeschaltet bleiben. Anmeldedaten bleiben Windows-verschlüsselt lokal.");
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exitCode = code; }
for (const child of children) { child.on("error", () => stop(1)); child.on("exit", (code) => stop(code ?? 0)); }
process.on("SIGINT", () => stop()); process.on("SIGTERM", () => stop());
