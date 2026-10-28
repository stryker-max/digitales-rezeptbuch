"use client";
import { useEffect, useState, type ReactNode } from "react";
import { browserSupportsWebAuthn, startAuthentication, startRegistration, type PublicKeyCredentialCreationOptionsJSON, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { remoteApiBase } from "@/lib/deployment";
import { apiFetch, remoteSessionEvent, remoteSessionKey } from "@/lib/remote-api";

async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Anmeldung fehlgeschlagen.");
  return data as T;
}

export function RemoteConnection({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(false), [version, setVersion] = useState(0);
  const [password, setPassword] = useState(""), [setup, setSetup] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [passkeys, setPasskeys] = useState(false);
  useEffect(() => {
    if (!remoteApiBase) return;
    const readSetup = () => {
      const capability = new URLSearchParams(location.hash.slice(1)).get("setup");
      if (capability && /^[A-Za-z0-9_-]{43}$/.test(capability)) {
        setSetup(capability); history.replaceState(null, "", location.pathname + location.search);
      }
    };
    readSetup(); window.addEventListener("hashchange", readSetup);
    setPasskeys(browserSupportsWebAuthn());
    const changed = () => { setSession(Boolean(localStorage.getItem(remoteSessionKey))); setVersion(v => v + 1); };
    changed(); window.addEventListener(remoteSessionEvent, changed);
    return () => { window.removeEventListener(remoteSessionEvent, changed); window.removeEventListener("hashchange", readSetup); };
  }, []);
  function remember(data: { session: string }) {
    if (typeof data.session !== "string" || data.session.length > 200) throw new Error("Ungültige Anmeldeantwort.");
    localStorage.setItem(remoteSessionKey, data.session); setPassword(""); setSetup(""); window.dispatchEvent(new Event(remoteSessionEvent));
  }
  async function connect() {
    setBusy(true); setError(""); setNotice("");
    try { remember(await post<{ session: string }>(`/api/session${setup ? "?setup=1" : ""}`, { password }, setup ? { "X-Recipe-Setup": setup } : {})); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Privater Zugang nicht erreichbar."); }
    finally { setBusy(false); }
  }
  async function usePasskey(registering: boolean) {
    setBusy(true); setError(""); setNotice("");
    try {
      if (registering) {
        const data = await post<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>("/api/passkey", { action: "register-options" });
        const credential = await startRegistration({ optionsJSON: data.options });
        await post("/api/passkey", { action: "register-verify", challengeId: data.challengeId, credential });
        setNotice("Passkey eingerichtet. Beim nächsten Anmelden kannst du Face ID oder die Entsperrung deines Geräts verwenden.");
      } else {
        const data = await post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>("/api/passkey", { action: "login-options" });
        const credential = await startAuthentication({ optionsJSON: data.options });
        remember(await post<{ session: string }>("/api/passkey", { action: "login-verify", challengeId: data.challengeId, credential }));
      }
    } catch (cause) {
      const name = cause && typeof cause === "object" && "name" in cause ? cause.name : "";
      setError(name === "NotAllowedError" ? "Passkey abgebrochen oder auf diesem Gerät nicht verfügbar. Dein Code oder Passwort funktioniert weiterhin." : cause instanceof Error ? cause.message : "Passkey nicht verfügbar.");
    } finally { setBusy(false); }
  }
  return <>{remoteApiBase && <div className="recipe-app"><div className="app remote-access"><section className="muted-panel metadata" aria-label="Privater Online-Zugang">
    {session ? <>
      <div className="actions"><span>Privates Rezeptbuch verbunden</span><button className="button" onClick={() => { localStorage.removeItem(remoteSessionKey); setNotice(""); setError(""); window.dispatchEvent(new Event(remoteSessionEvent)); }}>Dieses Gerät abmelden</button></div>
      {passkeys && <><button className="button" disabled={busy} onClick={() => void usePasskey(true)}>{busy ? "Einen Moment …" : "Face ID / Passkey einrichten"}</button><p className="small">Einmal einrichten, danach ohne Code anmelden. Auf dem iPhone mit Face ID, auf anderen Geräten mit deren Entsperrung.</p></>}
    </> : <>
      <h2>{setup ? "Dein privates Rezeptbuch einrichten" : "Dein privates Rezeptbuch öffnen"}</h2>
      <p>{setup ? "Wähle deinen Code oder dein Passwort. Danach kannst du Face ID einrichten." : "Mit Face ID oder deinem Code anmelden. Dieses Gerät merkt sich deinen Zugang."}</p>
      {!setup && passkeys && <><button className="button primary" disabled={busy} onClick={() => void usePasskey(false)}>{busy ? "Einen Moment …" : "Mit Face ID / Passkey öffnen"}</button><p className="small">Für einen bereits eingerichteten Passkey. Alternativ:</p></>}
      <form onSubmit={event => { event.preventDefault(); void connect(); }}>
        <label>Dein Code oder Passwort<input type="password" autoComplete={setup ? "new-password" : "current-password"} maxLength={200} required value={password} onChange={event => setPassword(event.target.value)} /></label>
        {setup && <p className="small">Zum Beispiel ein 6-stelliger Code. Keine Mindestlänge oder Zeichenregeln.</p>}
        <button className="button primary" disabled={busy}>{busy ? "Verbinden …" : setup ? "Festlegen und öffnen" : "Mit Code oder Passwort öffnen"}</button>
      </form>
    </>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section></div></div>}<div key={version}>{children}</div></>;
}
