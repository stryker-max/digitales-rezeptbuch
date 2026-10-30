"use client";
import { useState } from "react";
import { keepUnclearResolution, type AnalysisDraft, type ReviewedDraft } from "@/lib/analysis-contract";

type Props = {
  remote?: boolean; file: { name: string; type: string; url: string }; analysis: AnalysisDraft; draft: ReviewedDraft;
  onChange: (draft: ReviewedDraft) => void; resolutions: Record<string, string>; onResolve: (value: Record<string, string>) => void;
  onSave: () => void; onBack: () => void; saving: boolean; error: string;
};
export function RecipeImportReview({ remote = false, file, analysis, draft, onChange, resolutions, onResolve, onSave, onBack, saving, error }: Props) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const lines = (value: string) => value.split("\n").filter((line) => line.trim());
  const questions = analysis.issues.filter((issue) => issue.kind !== "missing");
  const unresolved = questions.filter((issue) => (resolutions[issue.id] ?? "").trim().length < 3);
  const question = questions[questionIndex];
  function nextQuestion(id: string, decision: string) {
    const next = { ...resolutions, [id]: decision };
    onResolve(next);
    const index = questions.findIndex((issue) => (next[issue.id] ?? "").trim().length < 3);
    setQuestionIndex(index < 0 ? questions.length : index);
  }
  const missingAmounts = lines(draft.ingredients).some((line) => !line.split("|")[0].trim() || line.split("|")[0].trim() === "?");
  return <div className="import-review">
    <div className="page-head"><div><p className="eyebrow">3 · Rezept ansehen</p><h1>Dein Rezept ist bereit.</h1><p className="sub">Kurz ansehen, dann fertig. Du kannst es auch ohne Mengenangaben speichern.</p></div></div>
    {question && <section className="muted-panel metadata review-question" aria-label="Rückfrage zum Foto">
      <p className="eyebrow">{questions.length > 1 ? `Rückfrage ${Math.min(questionIndex + 1, questions.length)} von ${questions.length}` : "Eine Rückfrage zum Foto"}</p>
      <h2>{question.message}</h2>
      <label>Deine Antwort<input aria-label={`Klärung: ${question.message}`} maxLength={2000} value={resolutions[question.id] ?? ""} onChange={(event) => onResolve({ ...resolutions, [question.id]: event.target.value })} placeholder="Was steht im Original?" /></label>
      <details><summary>Betroffene Stelle im Foto-Text</summary>{analysis.blocks.filter((block) => question.blockIds.includes(block.id)).map((block) => <p className="source-copy" key={block.id}>{block.text}</p>)}</details>
      <div className="actions"><button className="button primary" disabled={(resolutions[question.id] ?? "").trim().length < 3} onClick={() => nextQuestion(question.id, resolutions[question.id])}>Antwort übernehmen</button><button className="button" onClick={() => nextQuestion(question.id, keepUnclearResolution)}>Unklar lassen</button></div>
      <p className="small">Deine Antwort bleibt als Prüfnotiz erhalten. Rezepttext änderst du unter „Bei Bedarf etwas korrigieren“.</p>
    </section>}
    {!question && questions.length > 0 && <button className="text-button" onClick={() => setQuestionIndex(0)}>Rückfragen noch einmal ansehen</button>}
    <div className="import-grid manual-grid">
      <div className="manual-fields"><h2>{draft.title}</h2>
        {analysis.recipe?.title === null && <p className="small">Kein Titel in der Vorlage · „Rezept ohne Titel“ ist eine Anzeigehilfe.</p>}
        <p>{draft.servings ? `${draft.servings} Portionen` : "Portionszahl nicht angegeben"}</p>
        {missingAmounts && <p className="small">Ohne Mengenangaben? Kein Problem – wir übernehmen es so, wie es in deiner Vorlage steht.</p>}
        {analysis.issues.some((issue) => issue.kind === "missing") && <details><summary>Fehlende Angaben bleiben offen</summary>{analysis.issues.filter((issue) => issue.kind === "missing").map((issue) => <p key={issue.id}>{issue.message}</p>)}</details>}
        {questions.filter((issue) => resolutions[issue.id] === keepUnclearResolution).map((issue) => <p className="status" key={issue.id}>Ungeklärte Originalangabe: {issue.message}</p>)}
        <h3>Zutaten</h3>{!draft.ingredients.trim() && <p>In der Vorlage nicht angegeben.</p>}<ul className="ingredients">{lines(draft.ingredients).map((line, index) => { const [amount, unit, name] = line.split("|").map((s) => s.trim()); return <li key={index}><span>{name}</span><strong>{!amount || amount === "?" ? "Ohne Mengenangabe" : [amount, unit].filter(Boolean).join(" ")}</strong></li>; })}</ul>
        {draft.equipment.trim() && <><h3>Utensilien</h3><p>{lines(draft.equipment).join(" · ")}</p></>}
        <h3>Zubereitung</h3>{!draft.steps.trim() && <p>In der Vorlage nicht angegeben.</p>}<ol>{lines(draft.steps).map((text, index) => <li className="source-copy" key={index}>{text}</li>)}</ol>
        {draft.notes?.trim() && <><h3>Hinweise</h3>{lines(draft.notes).map((text, index) => <p className="source-copy" key={index}>{text}</p>)}</>}
    <details><summary>Bei Bedarf etwas korrigieren</summary><div className="metadata"><label>Titel<input aria-label="Titel" maxLength={200} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} /></label><label>Portionen, falls angegeben<input aria-label="Portionen, falls angegeben" inputMode="numeric" value={draft.servings} onChange={(e) => onChange({ ...draft, servings: e.target.value })} /></label><label>Zutaten · Menge | Einheit | Zutat<textarea aria-label="Zutaten · Menge | Einheit | Zutat" rows={6} value={draft.ingredients} onChange={(e) => onChange({ ...draft, ingredients: e.target.value })} /></label><label>Utensilien aus der Vorlage<textarea aria-label="Utensilien aus der Vorlage" rows={3} value={draft.equipment} onChange={(e) => onChange({ ...draft, equipment: e.target.value })} /></label><label>Arbeitsschritte · ein Schritt je Zeile<textarea aria-label="Arbeitsschritte · ein Schritt je Zeile" rows={6} value={draft.steps} onChange={(e) => onChange({ ...draft, steps: e.target.value })} /></label><label>Hinweise aus der Vorlage<textarea aria-label="Hinweise aus der Vorlage" rows={3} value={draft.notes ?? ""} onChange={(e) => onChange({ ...draft, notes: e.target.value })} /></label><label>Vollständige Abschrift<textarea aria-label="Vollständige Abschrift" rows={6} value={draft.transcription} onChange={(e) => onChange({ ...draft, transcription: e.target.value })} /></label></div></details>
    <details><summary>Abschrift und Herkunft ansehen</summary>{analysis.blocks.map((block) => <div key={block.id}><strong>Seite {block.page} · {block.id}</strong><p className="source-copy">{block.text}</p></div>)}{analysis.recipe?.excludedBlocks.map((item) => <p key={item.blockId}>Nicht als Rezepttext übernommen: {item.blockId} · {item.reason}</p>)}</details>
      </div>
      <details className="manual-source"><summary>Original ansehen · {file.name}</summary>{file.type.startsWith("image/") ? <img src={file.url} alt="Unveränderte Rezeptvorlage" /> : <object data={file.url} type="application/pdf" aria-label="Unveränderte PDF-Vorlage"><a href={file.url} target="_blank" rel="noreferrer">Original öffnen</a></object>}</details>
    </div>
    <div className="review-finish">
      {error && <p role="alert">{error}</p>}
      <p className="small">{unresolved.length ? `${unresolved.length} Rückfrage${unresolved.length > 1 ? "n" : ""} offen. Antworte kurz oder wähle „Unklar lassen“.` : `Mit „Fertig“ bestätigst du den Entwurf für ${remote ? "eure private Sammlung" : "deine Sammlung"}.`}</p>
      <div className="actions"><button className="button" disabled={saving} onClick={onBack}>Zurück</button><button className="button primary" disabled={saving || unresolved.length > 0} onClick={onSave}>{saving ? "Wird gespeichert …" : "Fertig – Rezept speichern"}</button></div>
    </div>
  </div>;
}
