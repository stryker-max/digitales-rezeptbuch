import { openJobRepository } from "@/lib/job-repository";
import { localRequest } from "@/lib/analysis-server";
import { privateServerRequest } from "@/lib/private-host";
import { createArchive } from "@/lib/local-archive";
import type { LocalRecipe } from "@/lib/local-store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!localRequest(request) || !privateServerRequest(request)) return Response.json({ error: "Privater Zugang erforderlich." }, { status: 403 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Ungültige Rezeptkennung." }, { status: 400 });
  const db = await openJobRepository();
  try {
    const row = await db.confirmedSource(id);
    if (!row) return Response.json({ error: "Rezept nicht gefunden." }, { status: 404 });
    const recipe: LocalRecipe = { ...JSON.parse(row.confirmed), sourceBlob: new Blob([Buffer.from(row.source)], { type: row.mime }) };
    return new Response(await createArchive([recipe]), { headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } finally { await db.close(); }
}
