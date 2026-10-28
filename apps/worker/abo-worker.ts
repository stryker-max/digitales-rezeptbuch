import { openJobRepository } from "../web/src/lib/job-repository.ts";
import { WorkerWake } from "./worker-wake.ts";
import { configured } from "../web/src/lib/analysis-server.ts";
import { chatgptRuntime, usingChatGPT } from "../web/src/lib/chatgpt-server.ts";
import { processOneAboJob } from "./process-abo-job.ts";

if (!usingChatGPT() || !configured()) throw new Error("Lokalen ChatGPT-Abo-Modus einrichten. Kein API-Schlüssel-Fallback.");
const limit = Number(process.env.ANALYSIS_DAILY_CALL_LIMIT ?? "20");
if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Ungültiges Tageslimit.");
const client = chatgptRuntime().client;
const db = await openJobRepository(); const wake = new WorkerWake(); let stopping = false;
process.on("SIGINT", () => { stopping = true; wake.notify(); }); process.on("SIGTERM", () => { stopping = true; wake.notify(); });
console.log("ChatGPT-Abo-Worker bereit. Keine API-Schlüssel und keine Rezeptinhalte im Protokoll.");
try {
  do {
    if (!await processOneAboJob(db, client, limit)) { if (process.argv.includes("--once")) break; await wake.wait(); continue; }
    if (process.argv.includes("--once")) break;
  } while (!stopping);
} finally { await db.close(); }
