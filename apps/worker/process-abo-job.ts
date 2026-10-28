import type { ChatGPTClient } from "@rezeptbuch/chatgpt-local";
import type { JobRepository } from "../web/src/lib/job-repository.ts";
import { createHash } from "node:crypto";
import { analysisImage } from "../web/src/lib/source-validation.ts";
import { recipeImportSchema, importInstructions } from "../web/src/lib/analysis-contract.ts";

export async function processOneAboJob(db: JobRepository, client: ChatGPTClient, limit: number): Promise<boolean> {
  const session = await client.getSession();
  if (!session.sharing) return false;
  const job = await db.claim(limit, "chatgpt");
  if (!job) return false;
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
  return true;
}
