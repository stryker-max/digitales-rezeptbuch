import { createChatGPT, type ChatGPTClient } from "@rezeptbuch/chatgpt-local";
import { isAbsolute } from "node:path";
import { windowsEncryption } from "./windows-encryption.ts";

type Runtime = { client: ChatGPTClient; signInUrl: string | null; signIn: Promise<unknown> | null; error: string | null };
const state = globalThis as typeof globalThis & { recipeChatGPTRuntime?: Runtime };
export const usingChatGPT = () => process.env.ANALYSIS_AUTH_MODE === "chatgpt";
export function chatgptRuntime(): Runtime {
  if (!usingChatGPT() || !process.env.RECIPE_CHATGPT_DIR || !isAbsolute(process.env.RECIPE_CHATGPT_DIR)) throw new Error("Lokaler ChatGPT-Abo-Zugang ist nicht eingerichtet.");
  if (!state.recipeChatGPTRuntime) {
    const runtime = { signInUrl: null, signIn: null, error: null } as unknown as Runtime;
    runtime.client = createChatGPT({ appName: "Digitales Rezeptbuch", appId: "digitales-rezeptbuch", redirectPort: 0, storageDir: process.env.RECIPE_CHATGPT_DIR, sendHostId: true, credentialEncryption: windowsEncryption,
      openBrowser: (url) => { if (new URL(url).origin !== "https://auth.openai.com") throw new Error("Unerwartete Anmeldeadresse."); runtime.signInUrl = url; },
    });
    state.recipeChatGPTRuntime = runtime;
  }
  return state.recipeChatGPTRuntime;
}
export function startChatGPTSignIn() {
  const runtime = chatgptRuntime();
  if (runtime.signIn) return;
  runtime.error = null; runtime.signInUrl = null;
  runtime.signIn = runtime.client.signIn().catch((error) => { runtime.error = error?.code ? `${error.code}: ${error.message}` : "ChatGPT-Anmeldung fehlgeschlagen."; }).finally(() => { runtime.signIn = null; runtime.signInUrl = null; });
}
export async function chatgptStatus() {
  const runtime = chatgptRuntime();
  const session = await runtime.client.getSession();
  return { session, connecting: Boolean(runtime.signIn), signInUrl: runtime.signInUrl, error: runtime.error };
}
