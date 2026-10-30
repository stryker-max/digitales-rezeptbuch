"use client";
import { apiFetch } from "@/lib/remote-api";
import { useEffect, useState } from "react";
type State = { serverHosted?: boolean; session: { status: string; sharing: boolean; identity?: { name?: string; email?: string } }; connecting: boolean; signInUrl: string | null; error?: string | null };
export function ChatGPTConnection({ onChange }: { onChange: (sharing: boolean, model: string) => void }) {
  const [state, setState] = useState<State | null>(null);
  const [models, setModels] = useState<{ slug: string; displayName: string }[]>([]);
  const [model, setModel] = useState("");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await apiFetch("/api/chatgpt", { cache: "no-store" }); const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!stopped) { setState(data); setError(""); timer = setTimeout(poll, data.connecting ? 1500 : 5000); }
      } catch (error) { if (!stopped) { setError(error instanceof Error ? error.message : "ChatGPT-Zustand nicht verfügbar."); timer = setTimeout(poll, 5000); } }
    }
    void poll(); return () => { stopped = true; clearTimeout(timer); };
  }, [refresh]);
  const sharing = state?.session.sharing === true;
  useEffect(() => {
    if (!sharing) { setModels([]); setModel(""); return; }
    let stopped = false;
    apiFetch("/api/chatgpt?models=1", { cache: "no-store" }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!stopped) {
      setModels(data.models);
      let saved = ""; try { saved = localStorage.getItem("recipe-chatgpt-model") ?? ""; } catch { /* Account default. */ }
      setModel(data.models.some((item: { slug: string }) => item.slug === saved) ? saved : data.models[0]?.slug ?? "");
    } }).catch((error) => { if (!stopped) setError(error.message); });
    return () => { stopped = true; };
  }, [sharing]);
  useEffect(() => { onChange(sharing, model); }, [sharing, model, onChange]);
  async function action(name: "signin" | "disconnect") {
    try { const response = await apiFetch(`/api/chatgpt?action=${name}`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRefresh((value) => value + 1); }
    catch (error) { setError(error instanceof Error ? error.message : "ChatGPT-Verbindung fehlgeschlagen."); }
  }
  return <section className="muted-panel metadata scan-connection"><h2>{sharing ? "KI bereit" : "KI-Verbindung"}</h2>
    {sharing ? <><p className="small" role="status">Foto-Erkennung mit deinem ChatGPT-Abo</p><details><summary>Abo-Einstellungen</summary><label>Modell aus deinem ChatGPT-Abo<select aria-label="ChatGPT-Modell" value={model} onChange={(event) => { setModel(event.target.value); try { localStorage.setItem("recipe-chatgpt-model", event.target.value); } catch { /* Current window only. */ } }}><option value="">Modell auswählen</option>{models.map((item) => <option value={item.slug} key={item.slug}>{item.displayName}</option>)}</select></label><p className="small">Verfügbare Modelle stammen aus deinem Konto. Ein Modell mit Bild-/PDF-Verständnis verwenden.</p><div className="actions"><a className="button" href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Abo-Nutzung verwalten</a><button className="button" onClick={() => void action("disconnect")}>ChatGPT trennen</button></div></details></>
      : state?.serverHosted ? <p>Die Abo-Verbindung muss über die geschützte Servereinrichtung erneuert werden. Deine gespeicherten Rezepte bleiben verfügbar.</p> : <><button className="button primary" disabled={state?.connecting} onClick={() => void action("signin")}>{state?.connecting ? "ChatGPT-Anmeldung läuft …" : "Continue with ChatGPT"}</button>{state?.session.status === "connected" && <p>Angemeldet, aber Abo-Nutzung noch nicht freigegeben.</p>}</>}
    {state?.signInUrl && <p><a className="button primary" href={state.signInUrl} target="_blank" rel="noreferrer">Anmeldung bei ChatGPT öffnen</a></p>}
    {(error || state?.error) && <p role="alert">{error || state?.error}</p>}
  </section>;
}
