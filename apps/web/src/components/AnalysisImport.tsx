"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { validateAnalysis, type AnalysisDraft } from "@/lib/analysis-contract";
import { staticHosting } from "@/lib/deployment";
import { ChatGPTConnection } from "./ChatGPTConnection";

export type AnalysisAccess = { id: string; token: string };
export const analysisJobKey = "digitales-rezeptbuch-analysis-job-v1";
const key = analysisJobKey;
const autoConsentKey = "digitales-rezeptbuch-auto-openai-consent-v1";
type JobView = { state: string; name: string; mime: string; result: AnalysisDraft | null; error?: string; model: string };
export function AnalysisImport({ file, onReview }: { file: File | null; onReview: (access: AnalysisAccess, file: File, analysis: AnalysisDraft) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [authMode, setAuthMode] = useState("api");
  const [subscription, setSubscription] = useState({ sharing: false, model: "" });
  const updateSubscription = useCallback((sharing: boolean, model: string) => setSubscription({ sharing, model }), []);
  const [consent, setConsent] = useState(false);
  const [oneRecipe, setOneRecipe] = useState(false);
  const [access, setAccess] = useState<AnalysisAccess | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // File selection or Abo authentication alone never grants transmission consent.
  const [automatic, setAutomatic] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const submitted = useRef<File | null>(null);
  const opening = useRef(false);
  useEffect(() => {
    if (staticHosting) return;
    fetch("/api/analysis", { cache: "no-store" }).then((r) => r.json()).then((data) => { setEnabled(data.enabled === true); setAuthMode(data.authMode ?? "api"); }).catch(() => {});
    try { const saved = JSON.parse(localStorage.getItem(key) ?? "null"); if (saved && /^[0-9a-f-]{36}$/i.test(saved.id) && /^[0-9a-f-]{36}$/i.test(saved.token)) setAccess(saved); } catch { /* No job to resume. */ }
    try { setAutomatic(localStorage.getItem(autoConsentKey) === "explicitly-enabled-v1"); } catch { /* Stay off if storage is unavailable. */ }
    setPreferencesReady(true);
  }, []);
  useEffect(() => { setConsent(false); setOneRecipe(false); }, [file]);
  useEffect(() => {
    if (!access || !enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/analysis/${access!.id}`, { cache: "no-store", headers: { Authorization: `Bearer ${access!.token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Auftragsstatus nicht verfügbar.");
        if (stopped) return;
        setJob(data); setError("");
        if (["queued", "processing"].includes(data.state)) timer = setTimeout(poll, 2500);
      } catch (error) {
        if (!stopped) { setError(error instanceof Error ? error.message : "Verbindung zum Auftrag unterbrochen."); timer = setTimeout(poll, 10000); }
      }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [access, enabled]);
  async function start() {
    if (!file || (!automatic && (!consent || !oneRecipe)) || busy || active || !ready) return;
    submitted.current = file;
    setBusy(true); setError("");
    try {
      const next = { id: crypto.randomUUID(), token: crypto.randomUUID() };
      localStorage.setItem(key, JSON.stringify(next));
      const form = new FormData();
      form.set("id", next.id); form.set("token", next.token); form.set("file", file); form.set("consent", "true"); form.set("oneRecipe", "true");
      if (authMode === "chatgpt") form.set("model", subscription.model);
      const response = await fetch("/api/analysis", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload fehlgeschlagen.");
      setAccess(next); setJob({ state: "queued", name: file.name, mime: file.type, result: null, model: "" });
    } catch (error) { setError(error instanceof Error ? error.message : "Auftrag konnte nicht gestartet werden."); }
    finally { setBusy(false); }
  }
  async function review() {
    if (!access || !job?.result || opening.current) return;
    opening.current = true;
    setBusy(true);
    try {
      const result = validateAnalysis(job.result, 10);
      const response = await fetch(`/api/analysis/${access.id}?source=1`, { headers: { Authorization: `Bearer ${access.token}` }, cache: "no-store" });
      if (!response.ok) throw new Error("Gesichertes Original nicht verfügbar.");
      const source = new File([await response.blob()], job.name, { type: job.mime });
      sessionStorage.setItem("recipe-import-opened", access.id);
      onReview(access, source, result);
    } catch (error) { setError(error instanceof Error ? error.message : "Prüfung konnte nicht geöffnet werden."); }
    finally { opening.current = false; setBusy(false); }
  }
  async function cancel() {
    if (!access) return;
    try {
      const response = await fetch(`/api/analysis/${access.id}`, { method: "POST", headers: { Authorization: `Bearer ${access.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      if (!response.ok) throw new Error("Abbruch konnte nicht bestätigt werden.");
      setJob((current) => current ? { ...current, state: "cancelled" } : null);
    } catch (error) { setError(error instanceof Error ? error.message : "Abbruch fehlgeschlagen."); }
  }
  const active = Boolean(job && ["queued", "processing"].includes(job.state));
  const ready = enabled && (authMode !== "chatgpt" || (subscription.sharing && Boolean(subscription.model)));
  useEffect(() => {
    if (preferencesReady && automatic && file && submitted.current !== file && ready && !active && !busy && !access) void start();
    // Each selected file is submitted at most once automatically. A failed call is
    // never silently retried. Permission comes from the separate opt-in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferencesReady, automatic, file, ready, active, busy, access]);
  useEffect(() => {
    if (!access || busy || job?.state !== "needs_review" || !job.result?.recipe) return;
    try { if (sessionStorage.getItem("recipe-import-opened") !== access.id) void review(); } catch { /* Explicit open remains available. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, job, busy]);
  function newImport() {
    localStorage.removeItem(key); setAccess(null); setJob(null); setError("");
    // Reusing this photo requires an explicit click, not an automatic second call.
    submitted.current = file;
  }
  if (staticHosting) return <section className="muted-panel"><h2>Foto automatisch erkennen</h2><p>Die Foto-Erkennung mit deinem ChatGPT-Abo läuft in der lokalen App auf deinem Rechner. Öffne dort das Rezeptbuch. Auf GitHub Pages kannst du deine gesicherte Sammlung wiederherstellen und offline kochen.</p><p className="small">Hier ist kein Analyseserver verbunden. Ausgewählte Fotos werden hier nicht übertragen.</p></section>;
  return <>{authMode === "chatgpt" && <ChatGPTConnection onChange={updateSubscription} />}<section className="muted-panel metadata"><h2>Foto rein. Rezept fertig.</h2><p>{enabled ? "Titel, Zutaten und Schritte werden automatisch übernommen. Das Original bleibt unverändert. Danach siehst du das fertige Rezept zum Vergleich und Speichern." : "Die automatische Erkennung ist hier nicht gestartet. Öffne die lokale App mit deinem ChatGPT-Abo."}</p>
    {enabled && <><label className="confirm-row"><input type="checkbox" checked={automatic} onChange={(event) => { const checked = event.target.checked; setAutomatic(checked); try { if (checked) localStorage.setItem(autoConsentKey, "explicitly-enabled-v1"); else localStorage.removeItem(autoConsentKey); } catch { /* Choice applies only in this window. */ } }} /><span>Automatisch erkennen: Von mir ausgewählte Rezeptfotos/PDFs an OpenAI senden. Ich wähle jeweils genau ein vollständiges Rezept aus.</span></label><p className="small">Freiwillig und jederzeit hier ausschaltbar. Gilt nur für hier ausgewählte Dateien, nicht für deine gespeicherte Sammlung. Die Erkennung nutzt deinen gewählten Zugang. Einen laufenden Auftrag bei Bedarf unten abbrechen.</p>
      {!automatic && <><label className="confirm-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Diese ausgewählte Datei zur Erkennung an OpenAI senden.</label><label className="confirm-row"><input type="checkbox" checked={oneRecipe} onChange={(event) => setOneRecipe(event.target.checked)} /> Die Datei enthält genau ein vollständiges Rezept, alle Seiten in richtiger Reihenfolge.</label></>}
      <button className="button primary" disabled={!file || !ready || (!automatic && (!consent || !oneRecipe)) || active || busy} onClick={() => void start()}>{busy ? "Wird verarbeitet …" : "Foto automatisch erkennen"}</button></>}
    {job && <div role="status"><p>{({ queued: "Foto gesichert · Erkennung startet gleich", processing: "Dein Rezept wird gelesen und gegliedert …", needs_review: "Dein Rezept ist bereit", failed: "Erkennung fehlgeschlagen", cancelled: "Erkennung abgebrochen", confirmed: "Bereits bestätigt · bei Bedarf erneut auf diesem Gerät speichern" } as Record<string, string>)[job.state] ?? job.state}</p>{job.error && <p>{job.error}</p>}{job.result && job.result.status !== "recipe" && <p>{({ not_recipe: "Kein Rezept erkannt. Bitte eine Rezeptvorlage auswählen.", unreadable: "Vorlage nicht ausreichend lesbar. Bitte ein schärferes Foto aufnehmen.", needs_source_selection: "Rezeptgrenzen unklar. Bitte genau ein vollständiges Rezept auswählen." } as Record<string, string>)[job.result.status]}</p>}{job.result?.status === "recipe" && !job.result.recipe && <p>Dieser ältere Entwurf enthält nur eine Abschrift. Bitte das Original erneut auswählen und automatisch erkennen lassen.</p>}{job.result?.recipe && ["needs_review", "confirmed"].includes(job.state) && <button className="button primary" disabled={busy} onClick={() => void review()}>Fertiges Rezept ansehen</button>}{active ? <button className="button" onClick={() => void cancel()}>Auftrag abbrechen</button> : <button className="button" onClick={newImport}>Nächstes Rezept</button>}<p className="small">Nach dem Upload läuft die Erkennung bei geschlossenem Browser weiter, solange der Rechner und der lokale Dienst laufen. Bei Fehlern kein automatischer erneuter Anbieteraufruf.</p></div>}
    {error && <p role="alert">{error}</p>}
  </section></>;
}
