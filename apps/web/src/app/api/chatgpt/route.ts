import { chatgptRuntime, chatgptStatus, startChatGPTSignIn, usingChatGPT } from "@/lib/chatgpt-server";
import { localRequest } from "@/lib/analysis-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  if (!localRequest(request) || !usingChatGPT()) return reply({ error: "Abo-Anmeldung nur in der lokalen Abo-Version verfügbar." }, 403);
  try {
    const status = await chatgptStatus();
    if (new URL(request.url).searchParams.has("models")) {
      if (!status.session.sharing) return reply({ error: "ChatGPT-Abo-Nutzung ist noch nicht freigegeben." }, 403);
      return reply({ models: await chatgptRuntime().client.listModels() });
    }
    return reply(status);
  } catch { return reply({ error: "Abo-Zustand konnte nicht sicher geladen werden." }, 503); }
}
export async function POST(request: Request) {
  if (!localRequest(request) || !usingChatGPT()) return reply({ error: "Lokaler Ursprung erforderlich." }, 403);
  try {
    const action = new URL(request.url).searchParams.get("action");
    if (action === "signin") { startChatGPTSignIn(); return reply({ started: true }, 202); }
    if (action === "disconnect") { const rt = chatgptRuntime(); rt.client.cancelSignIn(); await rt.client.disconnect(); return reply({ disconnected: true }); }
    return reply({ error: "Unbekannte Aktion." }, 422);
  } catch { return reply({ error: "Abo-Verbindung konnte nicht geändert werden." }, 503); }
}
