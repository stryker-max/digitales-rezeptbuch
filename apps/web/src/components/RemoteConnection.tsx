"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, Eye, EyeOff, UserRound, X } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication, startRegistration, type PublicKeyCredentialCreationOptionsJSON, type PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { QRCodeSVG } from "qrcode.react";
import { remoteApiBase } from "@/lib/deployment";
import { apiFetch, remoteSessionEvent, remoteSessionKey } from "@/lib/remote-api";
import { saveSetup, loadSetup, forgetSetup, validSetup } from "@/lib/setup-access";
import { OfflineStatus } from "./OfflineStatus";

type User = { id: string | null; email: string | null; name: string; role: "owner" | "member" };
const tabStorage = { getItem: (key: string) => sessionStorage.getItem(key), setItem: (key: string, value: string) => sessionStorage.setItem(key, value), removeItem: (key: string) => sessionStorage.removeItem(key) };
const inviteKey = "digitales-rezeptbuch-invite-v1";
class AccessError extends Error { constructor(message: string, readonly code?: string) { super(message); } }
async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  const response = await apiFetch(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new AccessError(data.error ?? "Anmeldung fehlgeschlagen.", data.code); return data as T;
}
export function RemoteConnection({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(false), [user, setUser] = useState<User | null>(null), [version, setVersion] = useState(0);
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [visible, setVisible] = useState(false);
  const [setup, setSetup] = useState(""), [invite, setInvite] = useState(""), [shareLink, setShareLink] = useState("");
  const [mode, setMode] = useState<"login" | "register" | "legacy">("login"), [legacy, setLegacy] = useState(false);
  const [busy, setBusy] = useState(false), [checking, setChecking] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [passkeys, setPasskeys] = useState(false), [settings, setSettings] = useState(false), [offline, setOffline] = useState(false), [members, setMembers] = useState<User[]>([]);
  const [pageBase, setPageBase] = useState(""), [transfer, setTransfer] = useState(false);
  const inspection = useRef(0);
  async function profile() {
    const response = await apiFetch("/api/account", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json(); setUser(data.user); setMembers(data.members ?? []);
  }
  useEffect(() => {
    if (!remoteApiBase) return;
    const load = async () => {
      const generation = ++inspection.current; setChecking(true);
      const fragment = new URLSearchParams(location.hash.slice(1)), capability = fragment.get("setup") ?? "", invitation = fragment.get("invite") ?? "";
      if (validSetup(capability)) saveSetup(tabStorage, capability);
      if (validSetup(invitation)) { try { sessionStorage.setItem(inviteKey, invitation); } catch {} }
      if (fragment.has("setup") || fragment.has("invite")) history.replaceState(null, "", location.pathname + location.search);
      const active = loadSetup(tabStorage); let activeInvite = "";
      try { activeInvite = sessionStorage.getItem(inviteKey) ?? ""; } catch {}
      if (!validSetup(activeInvite)) activeInvite = "";
      setSetup(active); setInvite(activeInvite); setMode(active || activeInvite ? "register" : "login");
      try {
        const response = await apiFetch("/api/session", { headers: active ? { "X-Recipe-Setup": active } : {} });
        const data = await response.json(); if (generation !== inspection.current) return;
        if (!response.ok) throw new Error("Anmeldung ist gerade nicht erreichbar. Bitte erneut versuchen.");
        setLegacy(data.configured && !data.accountsReady);
        if (active && (data.configured || data.setupValid !== true)) { forgetSetup(tabStorage); setSetup(""); setMode(activeInvite ? "register" : "login"); if (!data.configured) setError("Der Einrichtungslink ist ungültig. Bitte den persönlichen Link verwenden."); }
        if (localStorage.getItem(remoteSessionKey)) await profile();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Anmeldung vorübergehend nicht erreichbar."); }
      finally { if (generation === inspection.current) setChecking(false); }
    };
    setPageBase(location.origin + location.pathname); setPasskeys(browserSupportsWebAuthn());
    const changed = () => { setSession(Boolean(localStorage.getItem(remoteSessionKey))); setVersion(value => value + 1); };
    const refresh = () => { if (localStorage.getItem(remoteSessionKey)) void profile(); };
    changed(); void load(); window.addEventListener("hashchange", load); window.addEventListener(remoteSessionEvent, changed); window.addEventListener("online", refresh); window.addEventListener("focus", refresh);
    return () => { inspection.current++; window.removeEventListener("hashchange", load); window.removeEventListener(remoteSessionEvent, changed); window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  async function remember(data: { session: string; user?: User }) {
    if (typeof data.session !== "string" || data.session.length > 200) throw new Error("Ungültige Anmeldeantwort.");
    localStorage.setItem(remoteSessionKey, data.session); forgetSetup(tabStorage); try { sessionStorage.removeItem(inviteKey); } catch {}
    setSetup(""); setInvite(""); setTransfer(false); setPassword(""); setOffline(false); setMode("login");
    if (data.user) setUser(data.user); window.dispatchEvent(new Event(remoteSessionEvent)); await profile();
  }
  const complete = session && user?.id === null;
  const registering = mode === "register" || complete;
  async function connect() {
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "legacy" && !complete) await remember(await post("/api/session", { password }));
      else {
        if (registering && !setup && !invite && !complete) throw new Error("Dieses Rezeptbuch ist privat. Nutze die Einladung deines Haushalts oder den persönlichen Einrichtungslink.");
        await remember(await post("/api/account", { action: registering ? (invite ? "join" : "register-owner") : "login", email, password, name, ...(invite ? { invite } : {}) }, setup ? { "X-Recipe-Setup": setup } : {}));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Anmeldung fehlgeschlagen."); if (cause instanceof AccessError && cause.code === "USE_ACCOUNT") { setLegacy(false); setMode("login"); } }
    finally { setBusy(false); }
  }
  async function usePasskey(register: boolean) {
    setBusy(true); setError(""); setNotice("");
    try {
      if (register) {
        const data = await post<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>("/api/passkey", { action: "register-options" });
        const credential = await startRegistration({ optionsJSON: data.options }); await post("/api/passkey", { action: "register-verify", challengeId: data.challengeId, credential }); setNotice("Face ID ist eingerichtet.");
      } else {
        const data = await post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>("/api/passkey", { action: "login-options" });
        const credential = await startAuthentication({ optionsJSON: data.options }); await remember(await post("/api/passkey", { action: "login-verify", challengeId: data.challengeId, credential }));
      }
    } catch (cause) { const cancelled = cause && typeof cause === "object" && "name" in cause && cause.name === "NotAllowedError"; setError(cancelled ? "Anmeldung abgebrochen. Du kannst dein Passwort verwenden." : cause instanceof Error ? cause.message : "Face ID ist nicht verfügbar."); }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await post("/api/account", { action: "logout" }); } catch {}
    localStorage.removeItem(remoteSessionKey); setUser(null); setSettings(false); setShareLink(""); setError(""); setNotice(""); window.dispatchEvent(new Event(remoteSessionEvent));
  }
  async function invitePartner() {
    setBusy(true); setError("");
    try { const result = await post<{ invite: string }>("/api/account", { action: "invite" }); setShareLink(`${pageBase}#invite=${result.invite}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Einladung konnte nicht erstellt werden."); } finally { setBusy(false); }
  }
  const notifications = <>{error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}</>;
  const qr = (link: string) => <div className="invite-share"><QRCodeSVG value={link} size={224} marginSize={4} title="Private Einladung" /><p>Auf dem anderen Gerät scannen oder den Link persönlich weitergeben.</p><button type="button" className="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setNotice("Link kopiert."); } catch { setError("Bitte den QR-Code verwenden."); } }}>Link kopieren</button></div>;
  if (!remoteApiBase) return <>{children}</>;
  if ((!session || complete) && !offline) return <div className="recipe-app auth-page"><div className="app auth-card">
    <div className="auth-brand"><span className="brand-mark"><BookOpen size={25} /></span><span>Digitales Rezeptbuch</span></div>
    {checking ? <p role="status">Einen Moment …</p> : <>
      <h1>{complete ? "Dein Konto vervollständigen" : registering ? (invite ? "Zusammen kochen" : "Konto erstellen") : "Willkommen zurück"}</h1>
      <p className="auth-subtitle">{registering ? "Eigener Login. Euer gemeinsames Rezeptbuch." : "Melde dich bei eurem Rezeptbuch an."}</p>
      {registering && !setup && !invite && !complete ? <p>Du brauchst eine Einladung zu eurem Rezeptbuch. Die andere Person findet sie unter „Mein Konto → Partner einladen“.</p> : <form className="auth-form" onSubmit={event => { event.preventDefault(); void connect(); }}>
        {registering && <label>Dein Name<input autoComplete="name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>}
        {mode !== "legacy" || complete ? <label>E-Mail<input type="email" autoComplete="username" autoCapitalize="none" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></label> : null}
        <label>{mode === "legacy" && !complete ? "Bisheriger Code" : "Passwort"}<span className="password-field"><input type={visible ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} required maxLength={200} value={password} onChange={event => setPassword(event.target.value)} /><button type="button" className="password-toggle" aria-label={visible ? "Passwort ausblenden" : "Passwort anzeigen"} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={21} /> : <Eye size={21} />}</button></span></label>
        <button className="button primary auth-submit" disabled={busy}>{busy ? "Einen Moment …" : registering ? (invite ? "Einladung annehmen" : "Konto erstellen") : "Anmelden"}</button>
      </form>}
      {!registering && mode !== "legacy" && passkeys && <><div className="auth-divider">oder</div><button className="button auth-submit" disabled={busy} onClick={() => void usePasskey(false)}>Mit Face ID anmelden</button></>}
      {notifications}
      <div className="auth-links">{!complete && <button className="text-button" onClick={() => { setMode(registering || mode === "legacy" ? "login" : "register"); setError(""); }}>{registering || mode === "legacy" ? "Zur Anmeldung" : "Noch kein Konto?"}</button>}{legacy && !registering && mode !== "legacy" && <button className="text-button" onClick={() => { setMode("legacy"); setError(""); }}>Bisherigen Code verwenden</button>}</div>
      {setup && <details className="auth-transfer"><summary>Auf dem iPhone oder iPad fortsetzen</summary>{qr(`${pageBase}#setup=${setup}`)}</details>}
    </>}
    <button className="text-button auth-offline" onClick={() => setOffline(true)}>Gespeicherte Rezepte ohne Anmeldung öffnen</button>
    <OfflineStatus cooking={busy || Boolean(password || email || name)} />
  </div></div>;
  return <><div className="recipe-app"><div className="account-bar" data-testid="account-ready"><span>{session ? `${user?.name ?? "Mein Konto"} · Unser Rezeptbuch` : "Gespeicherte Rezepte"}</span><button className="text-button" onClick={() => { if (!session) { setOffline(false); return; } setSettings(value => !value); }}><UserRound size={19} />{session ? "Mein Konto" : "Anmelden"}</button></div>
    {settings && <section className="app account-settings"><div className="section-line"><h2>Unser Haushalt</h2><button className="icon-button" aria-label="Kontoeinstellungen schließen" onClick={() => setSettings(false)}><X size={20} /></button></div>
      <p>{user?.email}</p><p className="sub">Rezepte, Wochenplan und Einkaufsliste nutzt ihr gemeinsam.</p>
      {members.map(member => <div className="member-row" key={member.id}><span>{member.name}<small>{member.email}</small></span>{member.role === "owner" ? <span className="small">Inhaber</span> : <button className="text-button" onClick={async () => { if (!window.confirm("Diesen Zugang zum gemeinsamen Rezeptbuch entfernen? Eure Rezepte bleiben erhalten.")) return; try { await post("/api/account", { action: "remove-member", id: member.id }); await profile(); } catch { setError("Zugang konnte nicht entfernt werden."); } }}>Zugang entfernen</button>}</div>)}
      <div className="actions">{user?.role === "owner" && user.id && <button className="button" disabled={busy} onClick={() => void invitePartner()}>Partner einladen</button>}{passkeys && <button className="button" disabled={busy} onClick={() => void usePasskey(true)}>Face ID aktivieren</button>}<button className="button" onClick={() => void logout()}>Abmelden</button></div>
      {shareLink && qr(shareLink)}{notifications}
    </section>}
  </div><div key={version}>{children}</div></>;
}
