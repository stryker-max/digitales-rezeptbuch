import { openJobRepository } from "../web/src/lib/job-repository.ts";
import { createHash } from "node:crypto";
import { WorkerWake } from "./worker-wake.ts";
import { configured } from "../web/src/lib/analysis-server.ts";
import { analysisImage } from "../web/src/lib/source-validation.ts";
import { recipeImportSchema, importInstructions } from "../web/src/lib/analysis-contract.ts";

if (process.env.ANALYSIS_AUTH_MODE === "chatgpt" || !configured()) throw new Error("Dieser Worker benötigt den ausdrücklich eingerichteten API-Modus. Im Abo-Modus worker:abo verwenden.");
const limit = Number(process.env.ANALYSIS_DAILY_CALL_LIMIT ?? "5");
if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("ANALYSIS_DAILY_CALL_LIMIT muss zwischen 1 und 100 liegen.");
const db = await openJobRepository(); const wake = new WorkerWake();
let stopping = false;
process.on("SIGINT", () => { stopping = true; wake.notify(); });
process.on("SIGTERM", () => { stopping = true; wake.notify(); });
console.log("Lokaler Analyse-Worker bereit. Keine Rezeptinhalte in Protokollen.");
try {
  do {
    const job = await db.claim(limit);
    if (!job) { if (process.argv.includes("--once")) break; await wake.wait(); continue; }
    try {
      if (createHash("sha256").update(job.source).digest("hex") !== job.hash) throw new Error("Original-Prüfsumme stimmt nicht überein.");
      const file = job.mime === "application/pdf"
        ? { type: "input_file", filename: "rezept.pdf", file_data: `data:application/pdf;base64,${Buffer.from(job.source).toString("base64")}` }
        : { type: "input_image", image_url: `data:image/png;base64,${(await analysisImage(job.source)).toString("base64")}`, detail: "high" };
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(180000),
        body: JSON.stringify({ model: job.model, store: false, max_output_tokens: 12000,
          instructions: importInstructions,
          input: [{ role: "user", content: [{ type: "input_text", text: "Lies dieses eine Rezept vollständig und originalgetreu. Gib Abschrift und offene Lesefragen zurück." }, file] }],
          text: { format: { type: "json_schema", name: "recipe_transcription", strict: true, schema: recipeImportSchema } },
        }),
      });
      if (!response.ok) throw new Error(`Anbieterfehler HTTP ${response.status}. Keine automatische Wiederholung.`);
      const body = await response.json();
      if (body.status !== "completed") throw new Error("Analyse unvollständig oder abgelehnt. Keine Freigabe.");
      const messages = (body.output ?? []).filter((item: { type: string }) => item.type === "message");
      const content = messages.flatMap((item: { content: { type: string; text?: string }[] }) => item.content ?? []);
      if (content.some((item: { type: string }) => item.type === "refusal")) throw new Error("Anbieter hat die Analyse abgelehnt.");
      const text = content.filter((item: { type: string }) => item.type === "output_text").map((item: { text: string }) => item.text).join("");
      await db.publish(job, JSON.parse(text));
    } catch (error) {
      const message = error instanceof Error && /^(Anbieter|Analyse)/.test(error.message) ? error.message : "Analyse fehlgeschlagen oder unterbrochen. Keine automatische Wiederholung; Aufruf kann berechnet worden sein.";
      await db.fail(job.id, message);
    }
    if (process.argv.includes("--once")) break;
  } while (!stopping);
} finally { await db.close(); }
