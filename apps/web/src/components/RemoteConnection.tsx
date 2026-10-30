"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { browserSupportsWebAuthn, startAuthentication, startRegistration, type PublicKeyCredentialCreationOptionsJSON, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { remoteApiBase } from "@/lib/deployment";
import { apiFetch, remoteSessionEvent, remoteSessionKey } from "@/lib/remote-api";
import { QRCodeSVG } from "qrcode.react";
import { saveSetup, loadSetup, forgetSetup, validSetup } from "@/lib/setup-access";

const tabStorage = { getItem: (key: string) => sessionStorage.getItem(key), setItem: (key: string, value: string) => sessionStorage.setItem(key, value), removeItem: (key: string) => sessionStorage.removeItem(key) };
class AccessError extends Error { constructor(message: string, readonly code?: string) { super(message); } }

async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new AccessError(data.error ?? "Anmeldung fehlgeschlagen.", data.code);
  return data as T;
}

export function RemoteConnection({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(false), [version, setVersion] = useState(0);
  const [password, setPassword] = useState(""), [setup, setSetup] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [passkeys, setPasskeys] = useState(false);
  const [phase, setPhase] = useState<"checking" | "new" | "ready" | "unknown">("checking");
  const [pageBase, setPageBase] = useState(""), [transfer, setTransfer] = useState(false);
  const inspection = useRef(0);
  async function inspectAccess(capability: string) {
    const current = ++inspection.current;
    setPhase("checking");
    try {
      const response = await apiFetch("/api/session", { headers: capability ? { "X-Recipe-Setup": capability } : {} });
      const data = await response.json(); if (!response.ok || typeof data.configured !== "boolean") throw new Error("Zugang konnte nicht geprüft werden. Bitte erneut versuchen.");
      if (current !== inspection.current) return;
      if (data.configured || (capability && data.setupValid !== true)) {
        forgetSetup(tabStorage); setSetup(""); setTransfer(false);
        if (!data.configured) setError("Dieser Einrichtungslink ist ungültig. Bitte deinen persönlichen Einrichtungslink öffnen.");
      }
      setPhase(data.configured ? "ready" : "new");
    } catch (cause) { if (current === inspection.current) { setPhase("unknown"); setError(cause instanceof Error ? cause.message : "Privater Zugang vorübergehend nicht erreichbar."); } }
  }
  useEffect(() => {
    if (!remoteApiBase) return;
    const readSetup = () => {
      const capability = new URLSearchParams(location.hash.slice(1)).get("setup") ?? "";
      if (validSetup(capability)) {
        saveSetup(tabStorage, capability);
        setSetup(capability); history.replaceState(null, "", location.pathname + location.search);
      }
      const active = validSetup(capability) ? capability : loadSetup(tabStorage);
      if (active) setSetup(active);
      void inspectAccess(active);
    };
    setPageBase(location.origin + location.pathname);
    readSetup(); window.addEventListener("hashchange", readSetup);
    setPasskeys(browserSupportsWebAuthn());
    const changed = () => { setSession(Boolean(localStorage.getItem(remoteSessionKey))); setVersion(v => v + 1); };
    changed(); window.addEventListener(remoteSessionEvent, changed);
    return () => { inspection.current++; window.removeEventListener(remoteSessionEvent, changed); window.removeEventListener("hashchange", readSetup); };
  }, []);
  function remember(data: { session: string }) {
    if (typeof data.session !== "string" || data.session.length > 200) throw new Error("Ungültige Anmeldeantwort.");
    inspection.current++; localStorage.setItem(remoteSessionKey, data.session); forgetSetup(tabStorage); setPassword(""); setSetup(""); setTransfer(false); setPhase("ready"); window.dispatchEvent(new Event(remoteSessionEvent));
  }
  async function connect() {
    setBusy(true); setError(""); setNotice("");
    try { remember(await post<{ session: string }>(`/api/session${setup ? "?setup=1" : ""}`, { password }, setup ? { "X-Recipe-Setup": setup } : {})); }
    catch (cause) {
      if (cause instanceof AccessError && cause.code === "SETUP_REQUIRED") setPhase("new");
      if (cause instanceof AccessError && ["ALREADY_CONFIGURED", "SETUP_INVALID"].includes(cause.code ?? "")) { forgetSetup(tabStorage); setSetup(""); setTransfer(false); setPhase(cause.code === "ALREADY_CONFIGURED" ? "ready" : "new"); }
      setError(cause instanceof Error ? cause.message : "Privater Zugang nicht erreichbar.");
    }
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
    </> : phase === "checking" ? <p role="status">Dein Zugang wird geprüft …</p> : !setup && phase === "new" ? <>
      <h2>Dein Rezeptbuch wartet auf die Einrichtung</h2>
      <p>Es ist noch kein Code festgelegt. Öffne deinen persönlichen Einrichtungslink und wähle dort deinen Code. Der normale App-Link ist für die spätere Anmeldung.</p>
      <button className="button" onClick={() => { setError(""); void inspectAccess(loadSetup(tabStorage)); }}>Einrichtung erneut prüfen</button>
    </> : <>
      <h2>{setup ? "Dein privates Rezeptbuch einrichten" : "Dein privates Rezeptbuch öffnen"}</h2>
      <p>{setup ? "Wähle deinen Code oder dein Passwort. Danach kannst du Face ID einrichten." : "Mit Face ID oder deinem Code anmelden. Dieses Gerät merkt sich deinen Zugang."}</p>
      {!setup && passkeys && <><button className="button primary" disabled={busy} onClick={() => void usePasskey(false)}>{busy ? "Einen Moment …" : "Mit Face ID / Passkey öffnen"}</button><p className="small">Für einen bereits eingerichteten Passkey. Alternativ:</p></>}
      <form onSubmit={event => { event.preventDefault(); void connect(); }}>
        <label>Dein Code oder Passwort<input type="password" autoComplete={setup ? "new-password" : "current-password"} maxLength={200} required value={password} onChange={event => setPassword(event.target.value)} /></label>
        {setup && <p className="small">Zum Beispiel ein 6-stelliger Code. Keine Mindestlänge oder Zeichenregeln.</p>}
        <button className="button primary" disabled={busy}>{busy ? "Verbinden …" : setup ? "Festlegen und öffnen" : "Mit Code oder Passwort öffnen"}</button>
      </form>
      {setup && pageBase && <div className="setup-transfer">
        <button className="button" disabled={busy} onClick={() => setTransfer(value => !value)}>{transfer ? "QR-Code schließen" : "Am iPhone / iPad einrichten"}</button>
        {transfer && <><p>Scanne diesen QR-Code mit der Kamera deines iPhones oder iPads. Dort deinen Code festlegen, danach Face ID einrichten.</p>
          <QRCodeSVG value={`${pageBase}#setup=${setup}`} size={240} marginSize={4} level="M" title="Privater Einrichtungslink für dein Rezeptbuch" />
          <p className="small">Privater Einrichtungslink – nur auf deinen Geräten verwenden. Die Einrichtung ist nur einmal möglich.</p>
          <button className="button" onClick={async () => { try { await navigator.clipboard.writeText(`${pageBase}#setup=${setup}`); setNotice("Privater Einrichtungslink kopiert."); } catch { setError("Kopieren nicht verfügbar. Bitte den QR-Code verwenden."); } }}>Einrichtungslink kopieren</button>
        </>}
      </div>}
    </>}
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </section></div></div>}<div key={version}>{children}</div></>;
}
