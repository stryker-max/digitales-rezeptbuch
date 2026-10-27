import { localRequest, openJobs } from "@/lib/analysis-server";
import { privateServerRequest } from "@/lib/private-host";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!localRequest(request) || !privateServerRequest(request)) return Response.json({ error: "Privater Zugang erforderlich." }, { status: 403 });
  const db = openJobs();
  try {
    const rows = db.prepare("SELECT confirmed FROM jobs WHERE state='confirmed' AND confirmed IS NOT NULL ORDER BY created DESC LIMIT 100").all() as { confirmed: string }[];
    return Response.json({ recipes: rows.map(row => JSON.parse(row.confirmed)) }, { headers: { "Cache-Control": "private, no-store" } });
  } finally { db.close(); }
}
