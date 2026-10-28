"use client";
import { useEffect, useState, type ReactNode } from "react";
import { remoteApiBase } from "@/lib/deployment";
import { apiFetch, remoteSessionEvent, remoteSessionKey } from "@/lib/remote-api";

export function RemoteConnection({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(false), [version, setVersion] = useState(0);
  const [password, setPassword] = useState(""), [setup, setSetup] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    if (!remoteApiBase) return;
    const fragment = new URLSearchParams(location.hash.slice(1));
    const capability = fragment.get("setup");
    if (capability && /^[A-Za-z0-9_-]{43}$/.test(capability)) {
      setSetup(capability); history.replaceState(null, "", location.pathname + location.search);
    }
    const changed = () => { setSession(Boolean(localStorage.getItem(remoteSessionKey))); setVersion(v => v + 1); };
    changed(); window.addEventListener(remoteSessionEvent, changed);
    return () => window.removeEventListener(remoteSessionEvent, changed);
  }, []);
  async function connect() {
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`/api/session${setup ? "?setup=1" : ""}`, { method: "POST", headers: { "Content-Type": "application/json", ...(setup ? { "X-Recipe-Setup": setup } : {}) }, body: JSON.stringify({ password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Anmeldung fehlgeschlagen.");
      if (typeof data.session !== "string" || data.session.length > 200) throw new Error("Ungültige Anmeldeantwort.");
      localStorage.setItem(remoteSessionKey, data.session); setPassword(""); setSetup(""); window.dispatchEvent(new Event(remoteSessionEvent));
    } catch (error) { setError(error instanceof Error ? error.message : "Privater Zugang nicht erreichbar."); }
    finally { setBusy(false); }
  }
  return <>{remoteApiBase && <div className="recipe-app"><div className="app remote-access"><section className="muted-panel metadata" aria-label="Privater Online-Zugang">
    {session ? <div className="actions"><span>Privates Rezeptbuch verbunden</span><button className="button" onClick={() => { localStorage.removeItem(remoteSessionKey); window.dispatchEvent(new Event(remoteSessionEvent)); }}>Dieses Gerät abmelden</button></div>
      : <form onSubmit={event => { event.preventDefault(); void connect(); }}><h2>{setup ? "Dein privates Rezeptbuch einrichten" : "Dein privates Rezeptbuch öffnen"}</h2><p>{setup ? "Lege einmal dein eigenes Passwort fest. Damit öffnest du deine Sammlung auch auf iPhone und iPad." : "Mit deinem Passwort werden KI-Erkennung und deine private Sammlung verfügbar. Lokal gespeicherte Rezepte bleiben auch ohne Anmeldung nutzbar."}</p><label>Dein Passwort<input type="password" autoComplete={setup ? "new-password" : "current-password"} minLength={20} maxLength={200} required value={password} onChange={event => setPassword(event.target.value)} /></label><p className="small">Mindestens 20 Zeichen. Sicher aufbewahren.</p><button className="button primary" disabled={busy}>{busy ? "Verbinden …" : setup ? "Passwort festlegen und öffnen" : "Privates Rezeptbuch öffnen"}</button>{error && <p role="alert">{error}</p>}</form>}
  </section></div></div>}<div key={version}>{children}</div></>;
}
