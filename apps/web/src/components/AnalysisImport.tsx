"use client";
import { useEffect, useState } from "react";
import { validateAnalysis, type AnalysisDraft } from "@/lib/analysis-contract";
import { staticHosting } from "@/lib/deployment";

export type AnalysisAccess = { id: string; token: string };
const key = "digitales-rezeptbuch-analysis-job-v1";
type JobView = { state: string; name: string; mime: string; result: AnalysisDraft | null; error?: string; model: string };
export function AnalysisImport({ file, onReview }: { file: File | null; onReview: (access: AnalysisAccess, file: File, analysis: AnalysisDraft) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [consent, setConsent] = useState(false);
  const [oneRecipe, setOneRecipe] = useState(false);
  const [access, setAccess] = useState<AnalysisAccess | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (staticHosting) return;
    fetch("/api/analysis", { cache: "no-store" }).then((r) => r.json()).then((data) => setEnabled(data.enabled === true)).catch(() => {});
    try { const saved = JSON.parse(localStorage.getItem(key) ?? "null"); if (saved && /^[0-9a-f-]{36}$/i.test(saved.id) && /^[0-9a-f-]{36}$/i.test(saved.token)) setAccess(saved); } catch { /* No job to resume. */ }
  }, []);
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
    if (!file || !consent || !oneRecipe || busy) return;
    setBusy(true); setError("");
    try {
      const next = access && !job ? access : { id: crypto.randomUUID(), token: crypto.randomUUID() };
      localStorage.setItem(key, JSON.stringify(next));
      const form = new FormData();
      form.set("id", next.id); form.set("token", next.token); form.set("file", file); form.set("consent", "true"); form.set("oneRecipe", "true");
      const response = await fetch("/api/analysis", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload fehlgeschlagen.");
      setAccess(next); setJob({ state: "queued", name: file.name, mime: file.type, result: null, model: "" });
    } catch (error) { setError(error instanceof Error ? error.message : "Auftrag konnte nicht gestartet werden."); }
    finally { setBusy(false); }
  }
  async function review() {
    if (!access || !job?.result) return;
    setBusy(true);
    try {
      const result = validateAnalysis(job.result, 10);
      const response = await fetch(`/api/analysis/${access.id}?source=1`, { headers: { Authorization: `Bearer ${access.token}` }, cache: "no-store" });
      if (!response.ok) throw new Error("Gesichertes Original nicht verfügbar.");
      onReview(access, new File([await response.blob()], job.name, { type: job.mime }), result);
    } catch (error) { setError(error instanceof Error ? error.message : "Prüfung konnte nicht geöffnet werden."); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!access) return;
    try {
      const response = await fetch(`/api/analysis/${access.id}`, { method: "POST", headers: { Authorization: `Bearer ${access.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }) });
      if (!response.ok) throw new Error("Abbruch konnte nicht bestätigt werden.");
      setJob((current) => current ? { ...current, state: "cancelled" } : null);
    } catch (error) { setError(error instanceof Error ? error.message : "Abbruch fehlgeschlagen."); }
  }
  const active = job && ["queued", "processing"].includes(job.state);
  if (staticHosting) return <section className="muted-panel"><h2>Rezept selbst übertragen</h2><p className="small">Diese Webversion speichert Rezepte auf deinem Gerät. Foto/PDF auswählen und die Vorlage selbst übertragen. KI-Erkennung benötigt einen eigenen Analyseserver und ist hier noch nicht verfügbar.</p></section>;
  return <section className="muted-panel metadata"><h2>KI-Abschrift · optional</h2><p className="small">{enabled ? "Die ausgewählte Vorlage wird an OpenAI übertragen. Die Abschrift bleibt ungeprüft. Du vergleichst alle Quellblöcke und überträgst Zutaten und Schritte in die Prüfmaske. Modellaufrufe können Kosten verursachen." : "Nicht aktiviert. Für echte Erkennung müssen Server und separater Worker mit API-Schlüssel, Modell und privatem Speicher eingerichtet sein. Manuelle Übernahme funktioniert weiterhin."}</p>
    {enabled && <><label className="confirm-row"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> Ich möchte die ausgewählte Datei zur Erkennung an OpenAI übertragen lassen.</label><label className="confirm-row"><input type="checkbox" checked={oneRecipe} onChange={(event) => setOneRecipe(event.target.checked)} /> Die Datei enthält genau ein Rezept, mit allen zugehörigen Seiten in richtiger Reihenfolge.</label><button className="button" disabled={!file || !consent || !oneRecipe || Boolean(active) || busy} onClick={() => void start()}>{busy ? "Wird verarbeitet …" : "KI-Abschrift starten"}</button></>}
    {job && <div role="status"><p>{({ queued: "Gespeichert · wartet auf Worker", processing: "Handschrift und Drucktext werden gelesen", needs_review: "Abschrift bereit zum Prüfen", failed: "Analyse fehlgeschlagen", cancelled: "Analyse abgebrochen", confirmed: "Vom Nutzer bestätigt · Prüfung erneut öffnen, falls lokal noch nicht gespeichert" } as Record<string, string>)[job.state] ?? job.state}</p>{job.error && <p>{job.error}</p>}{job.result && job.result.status !== "recipe" && <p>{({ not_recipe: "Kein Rezept erkannt.", unreadable: "Vorlage nicht ausreichend lesbar. Neuaufnahme oder manuelle Übernahme erforderlich.", needs_source_selection: "Rezeptgrenzen unklar. Bitte eine Datei mit genau einem Rezept auswählen." } as Record<string, string>)[job.result.status]}</p>}{job.result?.status === "recipe" && ["needs_review", "confirmed"].includes(job.state) && <button className="button primary" disabled={busy} onClick={() => void review()}>Abschrift und Original prüfen</button>}{active && <button className="button" onClick={() => void cancel()}>Auftrag abbrechen</button>}<p className="small">Nach gespeichertem Upload läuft der Auftrag im Worker weiter. Ein Abbruch verhindert die Freigabe; laufende Anbieteraufrufe können trotzdem berechnet werden.</p></div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
