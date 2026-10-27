import { openJobRepository } from "../web/src/lib/job-repository.ts";
import { createHash } from "node:crypto";
import { WorkerWake } from "./worker-wake.ts";
import { configured } from "../web/src/lib/analysis-server.ts";
import { chatgptRuntime, usingChatGPT } from "../web/src/lib/chatgpt-server.ts";
import { analysisImage } from "../web/src/lib/source-validation.ts";
import { recipeImportSchema, importInstructions } from "../web/src/lib/analysis-contract.ts";

if (!usingChatGPT() || !configured()) throw new Error("Lokalen ChatGPT-Abo-Modus einrichten. Kein API-Schlüssel-Fallback.");
const limit = Number(process.env.ANALYSIS_DAILY_CALL_LIMIT ?? "20");
if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Ungültiges Tageslimit.");
const client = chatgptRuntime().client;
const db = await openJobRepository(); const wake = new WorkerWake(); let stopping = false;
process.on("SIGINT", () => { stopping = true; wake.notify(); }); process.on("SIGTERM", () => { stopping = true; wake.notify(); });
console.log("ChatGPT-Abo-Worker bereit. Keine API-Schlüssel und keine Rezeptinhalte im Protokoll.");
try {
  do {
    const session = await client.getSession();
    if (!session.sharing) { if (process.argv.includes("--once")) break; await wake.wait(); continue; }
    const job = await db.claim(limit, "chatgpt");
    if (!job) { if (process.argv.includes("--once")) break; await wake.wait(); continue; }
    try {
      if (createHash("sha256").update(job.source).digest("hex") !== job.hash) throw new Error("Original-Prüfsumme stimmt nicht überein.");
      if (job.profile_id !== session.profileId) throw new Error("ChatGPT-Konto stimmt nicht mit dem gestarteten Auftrag überein.");
      const models = await client.listModels();
      if (!models.some((model) => model.slug === job.model)) throw new Error("Gewähltes Modell ist für dieses ChatGPT-Konto nicht verfügbar.");
      const file = job.mime === "application/pdf"
        ? { type: "input_file" as const, filename: "rezept.pdf", file_data: `data:application/pdf;base64,${Buffer.from(job.source).toString("base64")}` }
        : { type: "input_image" as const, image_url: `data:image/png;base64,${(await analysisImage(job.source)).toString("base64")}`, detail: "high" as const };
      const result = await client.streamResponse({
        model: job.model, signal: AbortSignal.timeout(180000),
        instructions: importInstructions,
        input: [{ role: "user", content: [{ type: "input_text", text: "Lies dieses eine Rezept vollständig und originalgetreu. Liefere Abschrift, Rezeptgliederung und offene Lesefragen." }, file] }],
        format: { type: "json_schema", name: "recipe_import", strict: true, schema: recipeImportSchema },
      });
      const current = await client.getSession();
      if (!current.sharing || current.profileId !== job.profile_id) throw new Error("ChatGPT-Verbindung wurde während der Analyse geändert.");
      await db.publish(job, JSON.parse(result.text));
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = code === "subscription_sharing_usage_limit_exceeded" ? "ChatGPT-Abolimit erreicht. Nutzung in ChatGPT verwalten."
        : code === "subscription_sharing_usage_unavailable" ? "ChatGPT-Abo-Nutzung ist für diese Verbindung nicht verfügbar."
        : error instanceof Error && /^(ChatGPT|Gewähltes)/.test(error.message) ? error.message
        : `Abo-Analyse fehlgeschlagen${code ? ` (${code})` : ""}. Keine automatische Wiederholung und kein API-Fallback.`;
      await db.fail(job.id, message);
    }
    if (process.argv.includes("--once")) break;
  } while (!stopping);
} finally { await db.close(); }
