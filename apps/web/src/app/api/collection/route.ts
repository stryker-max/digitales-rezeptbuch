import { openJobRepository } from "@/lib/job-repository";
import { localRequest } from "@/lib/analysis-server";
import { privateServerRequest } from "@/lib/private-host";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!localRequest(request) || !privateServerRequest(request)) return Response.json({ error: "Privater Zugang erforderlich." }, { status: 403 });
  const db = await openJobRepository();
  try {
    const rows = await db.listConfirmed();
    return Response.json({ recipes: rows.map(row => JSON.parse(row)) }, { headers: { "Cache-Control": "private, no-store" } });
  } finally { await db.close(); }
}
