export const promptVersion = "recipe-transcription-2026-10-27.1";
export type SourceBlock = { id: string; page: number; text: string };
export type AnalysisDraft = {
  status: "recipe" | "not_recipe" | "needs_source_selection" | "unreadable";
  blocks: SourceBlock[];
  issues: { id: string; message: string; blockIds: string[] }[];
};
export const analysisSchema = {
  type: "object", additionalProperties: false, required: ["status", "blocks", "issues"],
  properties: {
    status: { type: "string", enum: ["recipe", "not_recipe", "needs_source_selection", "unreadable"] },
    blocks: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "page", "text"], properties: { id: { type: "string" }, page: { type: "integer" }, text: { type: "string" } } } },
    issues: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "message", "blockIds"], properties: { id: { type: "string" }, message: { type: "string" }, blockIds: { type: "array", items: { type: "string" } } } } },
  },
};
export function validateAnalysis(value: unknown, pageCount: number): AnalysisDraft {
  const draft = value as AnalysisDraft;
  if (!draft || !["recipe", "not_recipe", "needs_source_selection", "unreadable"].includes(draft.status) || !Array.isArray(draft.blocks) || draft.blocks.length > 500 || !Array.isArray(draft.issues) || draft.issues.length > 100) throw new Error("Ungültige Analyseantwort.");
  const ids = new Set<string>();
  for (const block of draft.blocks) {
    if (!block || typeof block.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(block.id) || ids.has(block.id) || !Number.isInteger(block.page) || block.page < 1 || block.page > pageCount || typeof block.text !== "string" || !block.text.trim() || block.text.length > 10000) throw new Error("Ungültiger Quellblock.");
    ids.add(block.id);
  }
  const issueIds = new Set<string>();
  for (const issue of draft.issues) {
    if (!issue || typeof issue.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(issue.id) || issueIds.has(issue.id) || typeof issue.message !== "string" || !issue.message.trim() || issue.message.length > 2000 || !Array.isArray(issue.blockIds) || issue.blockIds.length > 500 || !issue.blockIds.every((id) => ids.has(id))) throw new Error("Ungültiger Quellenverweis.");
    issueIds.add(issue.id);
  }
  if (draft.status === "recipe" && !draft.blocks.length) throw new Error("Leere Rezeptabschrift.");
  return draft;
}

export type ReviewedDraft = { title: string; servings: string; transcription: string; ingredients: string; equipment: string; steps: string; confirmed: boolean };
export function validateReview(value: unknown, analysis: AnalysisDraft, resolutions: unknown): { draft: ReviewedDraft; resolutions: Record<string, string> } {
  const draft = value as ReviewedDraft;
  if (analysis.status !== "recipe" || !draft || draft.confirmed !== true || ![draft.title, draft.servings, draft.transcription, draft.ingredients, draft.equipment, draft.steps].every((s) => typeof s === "string" && s.length <= 100000) || !draft.title.trim() || draft.title.length > 200 || !draft.transcription.trim() || !draft.ingredients.trim() || !draft.steps.trim() || (draft.servings !== "" && (!/^\d+$/.test(draft.servings) || Number(draft.servings) < 1 || Number(draft.servings) > 100))) throw new Error("Vollständiger Quellenvergleich und gültige Rezeptfelder erforderlich.");
  if (!resolutions || typeof resolutions !== "object" || Array.isArray(resolutions)) throw new Error("Prüfentscheidungen fehlen.");
  const entries = resolutions as Record<string, unknown>;
  const resolved: Record<string, string> = {};
  for (const issue of analysis.issues) {
    const decision = entries[issue.id];
    if (typeof decision !== "string" || decision.trim().length < 3 || decision.length > 2000) throw new Error("Offene Lesefragen verhindern die Freigabe.");
    resolved[issue.id] = decision.trim();
  }
  return { draft, resolutions: resolved };
}
