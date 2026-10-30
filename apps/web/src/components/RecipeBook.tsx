"use client";

import { apiFetch } from "@/lib/remote-api";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays,
  Camera, Check, ChefHat, Clock3, FileText, Heart, Minus, Plus, Search,
  ShoppingBasket, Sparkles, Upload, Users, X,
} from "lucide-react";
import { recipes, weekdays } from "@/lib/seed";
import { parseQuantity, remaining, shoppingForPlan, suggestPlan } from "@/lib/plan";
import { getLocalRecipe, listLocalRecipes, saveLocalRecipe, saveLocalRecipes, sha256, type LocalRecipe } from "@/lib/local-store";
import { createArchive, readFullArchive, sameRecipeContent, validateRecipeContent } from "@/lib/local-archive";
import { parsePreferences, preferencesKey, type LocalPreferences } from "@/lib/local-preferences";
import { suggestTags } from "@/lib/metadata";
import { RecipeMetadata } from "./RecipeMetadata";
import { OfflineStatus } from "./OfflineStatus";
import { SharedHousehold } from "./SharedHousehold";
import { AnalysisImport, analysisJobKey, type AnalysisAccess } from "./AnalysisImport";
import { draftFromAnalysis, type ReviewedDraft, type AnalysisDraft } from "@/lib/analysis-contract";
import { RecipeImportReview } from "./RecipeImportReview";
import { analysisAvailable } from "@/lib/deployment";
import { loadConfirmedCloudRecipes } from "@/lib/cloud-sync";
import type { Ingredient, PlanSlot, Recipe } from "@/lib/types";

type View = "library" | "detail" | "cook" | "plan" | "shopping" | "import" | "recognized" | "review";
type AppState = LocalPreferences & {
  view: View;
  recipeId: string;
  step: number;
  cookServings: number | null;
  sourceOpen: boolean;
  query: string;
  filter: string;
  targetDay: number | null;
  favorites: string[];
  plan: PlanSlot[];
  adopted: boolean;
  purchased: Record<string, number>;
  checks: Record<string, boolean>;
};

const initialState: AppState = {
  view: "library", recipeId: recipes[0].id, step: 0, cookServings: null, sourceOpen: false, query: "", filter: "Alle",
  targetDay: null, favorites: [recipes[0].id, recipes[3].id],
  plan: [{ recipeId: recipes[0].id, servings: 4 }, { recipeId: recipes[1].id, servings: 2 }, { recipeId: recipes[2].id, servings: 2 }, null, null, null, null],
  adopted: false, purchased: {}, checks: {}, metadata: {}, catalog: { version: 1, foods: [] }, manualItems: [], cookSession: null,
};
const tags = ["Alle", "Gemüse", "Fleisch", "Suppe", "Dessert"];
const format = (n: number) => new Intl.NumberFormat("de-AT", { maximumFractionDigits: 2 }).format(n);
const normalized = (text: string) => text.toLocaleLowerCase("de-AT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const blankDraft: ReviewedDraft = { title: "", servings: "", ingredients: "", equipment: "", steps: "", transcription: "", notes: "", confirmed: false };

function Photo({ recipe, className = "" }: { recipe: Recipe; className?: string }) {
  if (!recipe.imagePosition) return <div className={`photo no-photo ${className}`} role="img" aria-label={`Eigenes Rezept: ${recipe.title}`}><BookOpen size={38} /><span>Eigenes Rezept</span></div>;
  return <div className={`photo ${className}`} data-food={recipe.imagePosition} role="img" aria-label={`KI-Beispielbild: ${recipe.title}`} />;
}

function Action({ children, onClick, primary = false, disabled = false, className = "" }: {
  children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean; className?: string;
}) {
  return <button type="button" className={`button ${primary ? "primary" : ""} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function RecipeBook() {
  const [state, setState] = useState<AppState>(initialState);
  const [notice, setNotice] = useState("");
  const [cloudMode, setCloudMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; type: string; url: string; blob: File } | null>(null);
  const [fileError, setFileError] = useState("");
  const [userRecipes, setUserRecipes] = useState<LocalRecipe[]>([]);
  const [draft, setDraft] = useState(blankDraft);
  const [saving, setSaving] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferencesWritable, setPreferencesWritable] = useState(true);
  const [recipesReady, setRecipesReady] = useState(false);
  const [manualItem, setManualItem] = useState("");
  const [pendingRestore, setPendingRestore] = useState<Awaited<ReturnType<typeof readFullArchive>> | null>(null);
  const [analysisAccess, setAnalysisAccess] = useState<AnalysisAccess | null>(null);
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisDraft | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});

  useEffect(() => { window.scrollTo(0, 0); }, [state.view]);
  useEffect(() => () => { if (selectedFile) URL.revokeObjectURL(selectedFile.url); }, [selectedFile]);
  useEffect(() => {
    let stopped = false, running = false, remote = false, checked = false;
    async function refresh() {
      if (running || stopped) return; running = true;
      try {
        const items = await listLocalRecipes();
        if (stopped) return;
        setUserRecipes(items); setRecipesReady(true);
        if (analysisAvailable && !checked) {
          try { const config = await apiFetch("/api/analysis", { cache: "no-store" }).then(r => r.json()); remote = config.syncEnabled === true; checked = true; if (!stopped) setCloudMode(remote); } catch { /* Offline local collection remains available. */ }
        }
        if (remote) {
          const fresh = await loadConfirmedCloudRecipes(items);
          if (fresh.length && !stopped) {
            await saveLocalRecipes(fresh);
            const all = await listLocalRecipes();
            if (!stopped) { setUserRecipes(all); setNotice(`${fresh.length} bestätigte Rezepte aus deiner privaten Sammlung geladen.`); }
          }
        }
      } catch (error) { if (!stopped) setNotice(error instanceof Error ? error.message : "Der Rezept-Speicher ist nicht verfügbar."); }
      finally { running = false; }
    }
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh(); window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return () => { stopped = true; window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, []);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(preferencesKey);
      const preferences = parsePreferences(raw);
      if (preferences) setState((current) => ({ ...current, ...preferences }));
      else if (raw !== null) { setPreferencesWritable(false); setNotice("Gespeicherte Einstellungen sind ungültig und werden nicht überschrieben. Änderungen gelten bis zur Klärung nur in diesem Fenster."); }
    } catch { setPreferencesWritable(false); setNotice("Plan und Einstellungen konnten nicht geladen werden. Änderungen gelten nur in diesem Fenster."); }
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady || !preferencesWritable) return;
    try {
      window.localStorage.setItem(preferencesKey, JSON.stringify({
        plan: state.plan, adopted: state.adopted, purchased: state.purchased,
        favorites: state.favorites, checks: state.checks,
        metadata: state.metadata, catalog: state.catalog, manualItems: state.manualItems, cookSession: state.cookSession,
      }));
    } catch { setNotice("Plan und Einstellungen konnten nicht gespeichert werden. Bitte Sammlung sichern."); }
  }, [preferencesReady, preferencesWritable, state.plan, state.adopted, state.purchased, state.favorites, state.checks, state.metadata, state.catalog, state.manualItems, state.cookSession]);
  useEffect(() => {
    if (state.view === "cook" && recipesReady) setState((current) => ({ ...current, cookSession: { recipeId: current.recipeId, step: current.step, servings: current.cookServings } }));
  }, [state.view, state.recipeId, state.step, state.cookServings, recipesReady]);

  const allRecipes: Recipe[] = [...userRecipes, ...recipes].map((item) => ({ ...item, tags: state.metadata[item.id]?.tags ?? (item.demo ? item.tags : suggestTags(item).map((tag) => tag.tag)) }));
  const findRecipe = (id: string) => allRecipes.find((item) => item.id === id) ?? recipes[0];
  const recipe = findRecipe(state.recipeId);
  const shopping = useMemo(() => shoppingForPlan(state.plan, [...userRecipes, ...recipes]), [state.plan, userRecipes]);
  const openShopping = shopping.filter((item) => item.required === null || remaining(item.required, state.purchased[item.key] ?? 0)! > 0);
  const displayedRecipes = allRecipes.filter((item) => {
    const matchesTag = state.filter === "Alle" || item.tags.includes(state.filter);
    const words = [item.title, item.sourceText, ...item.tags, ...item.ingredients.map((ingredient) => ingredient.name)].join(" ");
    return matchesTag && normalized(words).includes(normalized(state.query));
  });
  const showHero = !userRecipes.length && !state.query && state.filter === "Alle" && state.targetDay === null;
  const cards = showHero ? displayedRecipes.filter((item) => item.id !== recipes[0].id) : displayedRecipes;

  function patch(changes: Partial<AppState>) { setState((current) => ({ ...current, ...changes })); }
  function navigate(view: View) { setNotice(""); patch({ view, targetDay: null }); }
  function openRecipe(id: string) { setNotice(""); patch({ view: "detail", recipeId: id, cookServings: null }); }
  function updatePlan(nextPlan: PlanSlot[], message = "") { patch({ plan: nextPlan }); setNotice(message); }
  function chooseRecipe(id: string) {
    if (state.targetDay === null) { openRecipe(id); return; }
    const nextPlan = [...state.plan];
    const chosen = findRecipe(id);
    nextPlan[state.targetDay] = { recipeId: id, servings: chosen.servings ?? 1 };
    patch({ plan: nextPlan, targetDay: null, view: "plan", filter: "Alle", query: "" });
    setNotice(`Für ${weekdays[state.targetDay]} eingeplant.${state.adopted ? " Einkaufsliste aktualisiert." : ""}`);
  }
  function addToPlan(id: string) {
    const day = state.plan.findIndex((slot) => !slot);
    if (day < 0) { navigate("plan"); setNotice("Alle Tage sind belegt. Tausche ein Gericht im Wochenplan aus."); return; }
    const nextPlan = [...state.plan];
    nextPlan[day] = { recipeId: id, servings: findRecipe(id).servings ?? 1 };
    patch({ view: "plan", plan: nextPlan });
    setNotice(`Für ${weekdays[day]} eingeplant.${state.adopted ? " Einkaufsliste aktualisiert." : ""}`);
  }
  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"].includes(file.type))) {
      setFileError("Bitte ein Foto oder PDF auswählen."); return;
    }
    if (file.size > 25 * 1024 * 1024) { setFileError("Die Datei darf höchstens 25 MB groß sein."); return; }
    setFileError("");
    setDraft(blankDraft);
    setAnalysisAccess(null); setAnalysisDraft(null); setResolutions({});
    setSelectedFile({ name: file.name, type: file.type, url: URL.createObjectURL(file), blob: file });
  }

  async function saveRecognized() {
    if (!selectedFile || !analysisAccess || !analysisDraft?.recipe || saving) return;
    setSaving(true); setFileError("");
    try {
      // Invoked only by the user's explicit “Fertig – Rezept speichern” action.
      const response = await apiFetch(`/api/analysis/${analysisAccess.id}`, { method: "POST", headers: { Authorization: `Bearer ${analysisAccess.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm", draft: { ...draft, confirmed: true }, resolutions }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Bestätigung fehlgeschlagen.");
      if (result.recipe.sourceHash !== await sha256(selectedFile.blob)) throw new Error("Original-Prüfsumme stimmt nicht mit dem Server überein.");
      const localRecipe: LocalRecipe = { ...result.recipe, sourceBlob: selectedFile.blob };
      validateRecipeContent(localRecipe);
      const existing = await getLocalRecipe(localRecipe.id);
      if (existing && !sameRecipeContent(existing, localRecipe)) throw new Error("Rezept-ID ist bereits mit anderen Daten vorhanden.");
      if (!existing) await saveLocalRecipe(localRecipe);
      setUserRecipes((current) => [localRecipe, ...current.filter((item) => item.id !== localRecipe.id)]);
      patch({ view: "detail", recipeId: localRecipe.id });
      setNotice(cloudMode ? "In deiner privaten Sammlung und auf diesem Gerät gespeichert. Bitte regelmäßig zusätzlich sichern." : "Auf diesem Gerät gespeichert. Mit „Sammlung sichern“ kannst du eine unabhängige Sicherung erstellen.");
      setDraft(blankDraft); setSelectedFile(null);
      setAnalysisAccess(null); setAnalysisDraft(null); setResolutions({});
      localStorage.removeItem(analysisJobKey);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Speichern fehlgeschlagen. Bitte die Vorlage behalten."); }
    finally { setSaving(false); }
  }

  async function downloadOriginal(id: string) {
    const stored = await getLocalRecipe(id);
    if (!stored) { setNotice("Das Original ist auf diesem Gerät nicht verfügbar."); return; }
    const url = URL.createObjectURL(stored.sourceBlob);
    const link = document.createElement("a");
    link.href = url; link.download = stored.sourceName; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function exportLocalRecipes() {
    try {
      if (!recipesReady || !preferencesReady) throw new Error("Die lokalen Daten werden noch geladen.");
      const file = await createArchive(await listLocalRecipes(), state);
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Digitales-Rezeptbuch-Sicherung-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setNotice("Sicherung heruntergeladen. Bewahre die Datei an einem sicheren Ort auf.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Sicherung fehlgeschlagen."); }
  }

  async function restoreLocalRecipes(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (!recipesReady) throw new Error("Die lokale Sammlung wird noch geladen.");
      const archive = await readFullArchive(file);
      const imported = archive.recipes;
      const existing = new Map(userRecipes.map((item) => [item.id, item]));
      for (const item of imported) {
        const old = existing.get(item.id);
        if (old && !sameRecipeContent(old, item)) {
          throw new Error("Eine Rezept-ID ist bereits mit anderen Daten vorhanden. Es wurde nichts importiert.");
        }
      }
      const fresh = imported.filter((item) => !existing.has(item.id));
      if (fresh.length) await saveLocalRecipes(fresh);
      setUserRecipes((current) => [...fresh, ...current]);
      setPendingRestore(archive.preferences ? archive : null);
      patch({ view: archive.preferences ? "import" : "library" });
      setNotice(`${fresh.length} ${fresh.length === 1 ? "Rezept" : "Rezepte"} mit Originalen wiederhergestellt.`);
    } catch (error) { setFileError(error instanceof Error ? error.message : "Sicherung konnte nicht gelesen werden."); }
  }

  function library() {
    return <>
      <div className="page-head"><div><p className="eyebrow">{userRecipes.length ? "Deine Sammlung" : "Deine Sammlung · Beispiel"}</p><h1>{state.targetDay === null ? "Was kochen wir heute?" : `Was gibt’s am ${weekdays[state.targetDay]}?`}</h1><p className="sub">Rezepte, gut sortiert und schnell gefunden.</p></div><div className="actions">{userRecipes.length > 0 && <Action onClick={() => void exportLocalRecipes()}><FileText size={18} /> Sammlung sichern</Action>}<Action onClick={() => navigate("import")} primary><Plus size={19} /> Rezept hinzufügen</Action></div></div>
      {showHero && <article className="hero" id="re-hero"><div className="hero-copy"><p className="eyebrow"><Sparkles size={16} /> Für einen gemütlichen Abend</p><h2>Kürbiscremesuppe</h2><p>Ein Beispiel für die neue Sammlung.</p><div className="hero-meta"><span><Clock3 size={16} /> 35 Minuten · Schätzung</span><span><Users size={16} /> 4 Portionen</span></div><Action onClick={() => openRecipe(recipes[0].id)} primary>Rezept ansehen <ArrowRight size={18} /></Action></div><div className="photo hero-photo" data-food="tl" role="img" aria-label="KI-Beispielbild: Kürbiscremesuppe"><span className="photo-label">Beispielbild</span></div></article>}
      <div className="library-tools"><label className="search"><Search size={19} aria-hidden="true" /><input type="search" aria-label="Rezepte durchsuchen" placeholder="Rezept, Zutat oder Stichwort …" value={state.query} onChange={(event) => patch({ query: event.target.value })} /></label><div className="filters" aria-label="Rezeptfilter">{[...new Set([...tags, ...allRecipes.flatMap((item) => item.tags)])].map((tag) => <button key={tag} type="button" className="filter" aria-pressed={state.filter === tag} onClick={() => patch({ filter: tag })}>{tag}</button>)}</div></div>
      {state.cookSession && recipesReady && allRecipes.some((item) => item.id === state.cookSession?.recipeId) && <div className="muted-panel"><strong>Letzten Kochdurchgang fortsetzen</strong><p>{findRecipe(state.cookSession.recipeId).title}</p><Action onClick={() => patch({ view: "cook", recipeId: state.cookSession!.recipeId, step: Math.min(state.cookSession!.step, 3 + findRecipe(state.cookSession!.recipeId).steps.length), cookServings: state.cookSession!.servings, sourceOpen: false })}>Weiterkochen</Action></div>}<div className="section-line"><h2>{state.targetDay !== null ? `Rezept für ${weekdays[state.targetDay]} wählen` : showHero ? "Mehr aus deiner Sammlung" : "Gefundene Rezepte"}</h2><span className="small" aria-live="polite">{cards.length} {cards.length === 1 ? "Rezept" : "Rezepte"}</span></div>
      <div className="recipe-grid">{cards.length ? cards.map((item) => <article className="recipe-card" key={item.id}><div className="card-image"><Photo recipe={item} /><button type="button" className="favorite" aria-label={`${item.title} als Favorit`} aria-pressed={state.favorites.includes(item.id)} onClick={() => patch({ favorites: state.favorites.includes(item.id) ? state.favorites.filter((id) => id !== item.id) : [...state.favorites, item.id] })}><Heart size={19} fill={state.favorites.includes(item.id) ? "currentColor" : "none"} /></button></div><div className="recipe-copy"><span className="tag">{item.tags.join(" · ") + (item.demo ? " · Beispiel" : " · Eigenes Rezept")}</span><h3>{item.title}</h3><div className="card-foot"><span className="small">{item.estimatedMinutes === null ? "Zeit offen" : `${item.estimatedMinutes} Min`} · {item.servings ?? "?"} Port.</span><button type="button" className="text-button" onClick={() => chooseRecipe(item.id)}>{state.targetDay === null ? "Ansehen" : "Einplanen"}<ArrowUpRight size={17} /></button></div></div></article>) : <div className="empty"><h3>Kein passendes Rezept</h3><p className="sub">Versuche einen anderen Begriff oder Filter.</p></div>}</div>{notice && <p className="status" role="status">{notice}</p>}
    </>;
  }

  function detail() {
    return <><button type="button" className="text-button back" onClick={() => navigate("library")}><ArrowLeft size={18} /> Zur Sammlung</button><div className="detail-grid"><div><Photo recipe={recipe} className="detail-photo" />{!recipe.demo && <div className="muted-panel"><strong>Originalvorlage</strong><p className="small">Auf diesem Gerät gespeichert. SHA-256: {(recipe as LocalRecipe).sourceHash.slice(0, 16)}…</p><Action onClick={() => void downloadOriginal(recipe.id)}><FileText size={18} /> Original herunterladen</Action></div>}<RecipeMetadata recipe={recipe} value={state.metadata[recipe.id] ?? {}} catalog={state.catalog} onChange={(value) => patch({ metadata: { ...state.metadata, [recipe.id]: value } })} onCatalog={(catalog) => patch({ catalog })} onError={setNotice} /></div><div><span className="pill">{recipe.demo ? "Künstliches Beispiel" : "Eigenes Rezept · vom Nutzer geprüft"}</span><h1 className="detail-title">{recipe.title}</h1><p className="sub">{recipe.description}</p>{recipe.sourceNotes?.length ? <section><h2>Hinweise zum Rezept</h2>{recipe.sourceNotes.map((note, index) => <p className="source-copy" key={index}>{note}</p>)}</section> : null}<div className="facts"><div><span>Gesamtzeit {recipe.demo ? "· Beispiel" : ""}</span><strong>{recipe.estimatedMinutes ?? "Nicht angegeben"}{recipe.estimatedMinutes ? " Min" : ""}</strong></div><div><span>Rezeptmenge</span><strong>{recipe.servings === null ? "Nicht angegeben" : `${recipe.servings} Portionen`}</strong></div><div><span>Zubereitung</span><strong>{recipe.steps.length} Schritte</strong></div></div><div className="actions"><Action onClick={() => patch({ view: "cook", step: 0, sourceOpen: false, cookServings: null })} primary><ChefHat size={19} /> Rezept kochen</Action><Action onClick={() => addToPlan(recipe.id)}><CalendarDays size={19} /> Einplanen</Action></div><h2 className="ingredient-heading">Zutaten</h2><ul className="ingredients">{recipe.ingredients.map((item) => <li key={item.id}><span>{item.name}</span><strong>{item.amountText}</strong></li>)}</ul></div></div>{notice && <p className="status" role="status">{notice}</p>}</>;
  }

  function plan() {
    return <><div className="page-head"><div><p className="eyebrow">Wochenplan</p><h1>Deine Woche. Dein Menü.</h1><p className="sub">Gerichte auswählen – der Einkauf ergibt sich daraus.</p></div><Action onClick={() => updatePlan(suggestPlan(state.plan, allRecipes), "Freie Tage mit Rezepten gefüllt.")}><Sparkles size={18} /> Vorschlag füllen</Action></div>
      <div className="week-grid">{weekdays.map((day, index) => { const slot = state.plan[index]; const item = slot ? allRecipes.find((candidate) => candidate.id === slot.recipeId) : null; return <article className="day-card" key={day}><div className="day-head"><h3>{day}</h3><span className="day-date">{item?.demo ? "Beispielrezept" : "Dein Plan"}</span></div>{slot && item ? <><div className="day-recipe"><Photo recipe={item} className="thumb" /><div><span className="tag">{item.demo ? item.tags[0] : "Eigenes Rezept"}</span><h3>{item.title}</h3><span className="small">{item.estimatedMinutes === null ? "Zeit offen" : `${item.estimatedMinutes} Minuten`}</span></div></div><div className="day-actions"><label className="small">{item.servings === null ? "Rezeptmengen" : "Portionen"} <select className="select" aria-label={`${item.servings === null ? "Rezeptmengen" : "Portionen"} am ${day}`} value={slot.servings} onChange={(event) => { const next = [...state.plan]; next[index] = { ...slot, servings: Number(event.target.value) }; updatePlan(next, state.adopted ? "Plan und Einkaufsliste aktualisiert." : "Portionen geändert."); }}>{[...new Set([1, 2, 4, 6, slot.servings])].sort((a, b) => a - b).map((count) => <option key={count} value={count}>{count}</option>)}</select></label><div className="actions"><button type="button" className="icon-button" aria-label={`Gericht am ${day} austauschen`} onClick={() => patch({ view: "library", targetDay: index, query: "", filter: "Alle" })}><ArrowLeftRight size={19} /></button><button type="button" className="icon-button" aria-label={`Gericht am ${day} entfernen`} onClick={() => { const next = [...state.plan]; next[index] = null; updatePlan(next, "Gericht entfernt."); }}><X size={19} /></button></div></div><Action onClick={() => patch({ view: "cook", recipeId: item.id, step: 0, sourceOpen: false, cookServings: slot.servings })} className="day-cook"><ChefHat size={17} /> Geplantes Rezept kochen</Action></> : <button type="button" className="empty-day" onClick={() => patch({ view: "library", targetDay: index, query: "", filter: "Alle" })}><Plus size={19} /> Rezept auswählen</button>}</article>; })}</div>
      <div className="plan-summary"><div><h3>{state.plan.filter(Boolean).length} Tage geplant</h3><p className="sub">{state.adopted ? "Deine Einkaufsliste wird bei Änderungen mitgeführt." : "Beim Übernehmen entsteht automatisch deine Einkaufsliste."}</p></div><Action onClick={() => patch({ adopted: true, view: "shopping" })} primary disabled={!state.plan.some(Boolean)}><ShoppingBasket size={19} /> {state.adopted ? "Zum Einkauf" : "Plan übernehmen"}</Action></div>{notice && <p className="status" role="status">{notice}</p>}</>;
  }

  function shoppingView() {
    if (!state.adopted) return <><div className="page-head"><div><p className="eyebrow">Alles auf einer Liste</p><h1>Dein Einkauf</h1></div></div><div className="empty"><ShoppingBasket size={31} /><h2>Erst das Menü, dann der Einkauf.</h2><p className="sub">Übernimm den Wochenplan. Die Zutaten werden automatisch zusammengerechnet.</p><Action onClick={() => navigate("plan")} primary>Zum Wochenplan <ArrowRight size={18} /></Action></div></>;
    const groups = [...new Set(shopping.map((item) => item.group))];
    return <><div className="page-head"><div><p className="eyebrow">Aus deinem Wochenplan</p><h1>Einmal einkaufen. Gut vorbereitet.</h1><p className="sub">Gleiche Zutaten sind bereits zusammengefasst.</p></div></div><div className="shopping-layout"><div>{groups.map((group) => <section className="shopping-group" key={group}><h2 className="group-title"><ShoppingBasket size={17} />{group}</h2>{shopping.filter((item) => item.group === group).map((item) => { const bought = state.purchased[item.key] ?? 0; const left = remaining(item.required, bought); const done = left === 0; return <label key={item.key} className={`shop-row ${done ? "done" : ""}`}><input type="checkbox" disabled={item.required === null} aria-label={`${item.name} ${item.days.map((day) => weekdays[day]).join(" und ")}`} checked={done} onChange={(event) => patch({ purchased: { ...state.purchased, [item.key]: event.target.checked ? item.required ?? 0 : 0 } })} /><span><strong>{item.name}</strong><small>{item.days.map((day) => weekdays[day]).join(" · ")}{bought > 0 && !done ? ` · ${format(bought)} ${item.unit ?? ""} gekauft` : ""}</small></span><strong>{left === null ? "Menge prüfen" : `${format(done ? item.required ?? 0 : left)} ${item.unit ?? ""}`}</strong></label>; })}</section>)}</div><section className="shopping-group"><h2>Zusätzliche Positionen</h2>{state.manualItems.map((item) => <label className="shop-row" key={item.id}><input type="checkbox" checked={item.done} onChange={(event) => patch({ manualItems: state.manualItems.map((row) => row.id === item.id ? { ...row, done: event.target.checked } : row) })} /><span>{item.text}</span><button className="icon-button" type="button" aria-label={`${item.text} entfernen`} onClick={() => patch({ manualItems: state.manualItems.filter((row) => row.id !== item.id) })}><X size={18} /></button></label>)}<form className="metadata" onSubmit={(event) => { event.preventDefault(); if (!manualItem.trim() || state.manualItems.length >= 200) return; patch({ manualItems: [...state.manualItems, { id: crypto.randomUUID(), text: manualItem.trim(), done: false }] }); setManualItem(""); }}><label>Eigene Einkaufsposition<input maxLength={300} value={manualItem} onChange={(event) => setManualItem(event.target.value)} /></label><button className="button" type="submit">Hinzufügen</button></form></section><aside className="shopping-side"><p className="eyebrow">Deine Liste</p><h2>{openShopping.length} Positionen offen</h2><p className="sub">Für {state.plan.filter(Boolean).length} geplante Tage. Änderungen am Menü werden hier berücksichtigt.</p><Action onClick={() => navigate("plan")}>Menü bearbeiten <ArrowUpRight size={18} /></Action></aside></div>{notice && <p className="status" role="status">{notice}</p>}</>;
  }

  function checkRow(key: string, label: string, note = "", quantity = "") {
    return <label className="check-row" key={key}><input type="checkbox" checked={Boolean(state.checks[key])} onChange={(event) => patch({ checks: { ...state.checks, [key]: event.target.checked } })} /><span>{label}{note && <small>{note}</small>}</span>{quantity && <strong>{quantity}</strong>}</label>;
  }

  function cook() {
    const last = 3 + recipe.steps.length;
    const planned = state.cookServings !== null;
    const targetServings = state.cookServings ?? recipe.servings;
    const plannedAmount = (item: Ingredient) => item.quantity !== null && targetServings !== null
      ? `${format(item.quantity * targetServings / (recipe.servings ?? 1))} ${item.unit ?? ""}`.trim()
      : "Menge prüfen";
    const panels: ReactNode[] = [
      <><span className="step-number">Vorbereitung</span><h2>Alles griffbereit.</h2>{recipe.equipment.map((item, index) => checkRow(`e-${recipe.id}-${index}`, item.name, item.origin === "source" ? "In der Vorlage genannt" : "Vorgeschlagen"))}</>,
      <><span className="step-number">Vorbereitung</span><h2>Zutaten bereitlegen.</h2>{planned && <p className="small">Planmenge: {targetServings} {recipe.servings === null ? "Rezeptmengen" : "Portionen"}. Die Originalmengen stehen darunter.</p>}{recipe.ingredients.map((item) => checkRow(`i-${recipe.id}-${item.id}`, item.name, planned ? `Original: ${item.amountText}` : "", planned ? plannedAmount(item) : item.amountText))}</>,
      <><span className="step-number">Vorbereitung</span><h2>Bereit zum Loskochen?</h2><p className="instruction">{recipe.description}</p>{recipe.sourceNotes?.map((note, index) => <p className="source-copy" key={index}>{note}</p>)}<div className="facts"><div><span>Gesamtzeit{recipe.demo ? " · Beispiel" : ""}</span><strong>{recipe.estimatedMinutes === null ? "Nicht angegeben" : `${recipe.estimatedMinutes} Min`}</strong></div><div><span>{planned ? (recipe.servings === null ? "Rezeptmengen" : "Planportionen") : "Portionen"}</span><strong>{targetServings ?? "Nicht angegeben"}</strong></div><div><span>Schritte</span><strong>{recipe.steps.length}</strong></div></div>{planned && <p className="small">Original: {recipe.servings === null ? "Portionszahl nicht angegeben" : `${recipe.servings} Portionen`}. Zeiten und Temperaturen werden nicht umgerechnet.</p>}</>,
      ...recipe.steps.map((item, index) => <><span className="step-number">Schritt {index + 1} von {recipe.steps.length}</span><h2>{item.title}</h2><p className="instruction">{item.instruction}</p>{planned && <p className="small">Anleitung im Originalwortlaut. Zahlen im Text sind Originalmengen – Anpassung prüfen.</p>}{item.relatedIngredients.length > 0 && <div className="step-ingredients">{item.relatedIngredients.map((ingredient) => <span className="pill" key={ingredient}>{ingredient}</span>)}</div>}</>),
      <><span className="finish-symbol"><Check size={30} /></span><h2>Fertig gekocht.</h2><p>Guten Appetit!</p><Action onClick={() => navigate("library")} primary>Zur Sammlung <ArrowRight size={18} /></Action></>,
      <><span className="step-number">{recipe.demo ? "Künstliche Beispielvorlage" : "Bestätigte Abschrift"}</span><h2>Zum Nachlesen.</h2><p className="source-copy">{recipe.sourceText}</p></>,
    ];
    const active = state.sourceOpen ? last + 1 : state.step;
    const counter = state.step < 3 ? ["Vorbereitung", `${state.step + 1} / 3`] : state.step === last ? ["Fertig", `${recipe.steps.length} / ${recipe.steps.length}`] : ["Schritt", `${state.step - 2} / ${recipe.steps.length}`];
    return <><div className="cook-header"><Photo recipe={recipe} className="thumb" /><div><p className="eyebrow">Kochmodus{recipe.demo ? " · Beispiel" : ""}</p><h1>{recipe.title}</h1></div></div><nav className="cook-nav" aria-label="Kochschritte"><button type="button" className="button" disabled={state.step === 0} onClick={() => patch({ step: state.step - 1, sourceOpen: false })}><ArrowLeft size={18} /> Zurück</button><div className="cook-counter" aria-live="polite">{counter[0]}<strong>{counter[1]}</strong></div><button type="button" className="button primary" disabled={state.step === last} onClick={() => patch({ step: state.step + 1, sourceOpen: false })}>Weiter <ArrowRight size={18} /></button></nav><div className="cook-stack">{panels.map((panel, index) => <section key={index} className={`cook-panel ${index === last ? "finish" : ""} ${active === index ? "is-active" : ""}`} aria-hidden={active !== index} inert={active !== index}>{panel}</section>)}</div><div className="cook-bottom"><div className="step-track" aria-hidden="true">{Array.from({ length: last + 1 }, (_, index) => <span key={index} className={index <= state.step ? "on" : ""} />)}</div><button type="button" className="text-button" onClick={() => patch({ sourceOpen: !state.sourceOpen })}>{state.sourceOpen ? <ArrowLeft size={17} /> : <FileText size={17} />}{state.sourceOpen ? " Zur Anleitung" : " Originaltext"}</button></div></>;
  }

  function importView() {
    return <><div className="page-head"><div><p className="eyebrow">Aus Papier wird ein Rezept</p><h1>Foto rein. Rezept fertig.</h1><p className="sub">1 · Foto aufnehmen   →   2 · Erkennen   →   3 · Fertig</p></div></div>{analysisAvailable && <div className="upload-zone"><Camera size={32} /><h2 className="upload-title">Deine Rezeptvorlage.</h2><p className="sub">Ein Rezept pro Aufnahme. Mehrere Seiten als ein PDF auswählen.</p><div className="actions"><label className="button primary file-label"><Camera size={19} /> Foto aufnehmen<input type="file" accept="image/*" capture="environment" onChange={selectFile} /></label><label className="button file-label"><Upload size={19} /> Datei auswählen<input type="file" accept="image/*,application/pdf" onChange={selectFile} /></label></div>{fileError && <p className="status" role="alert">{fileError}</p>}{selectedFile && <div className="selected-file"><strong>{selectedFile.name}</strong>{selectedFile.type.startsWith("image/") && !selectedFile.type.includes("heic") && !selectedFile.type.includes("heif") && <img src={selectedFile.url} alt="Vorschau der ausgewählten Datei" />}</div>}</div>}<AnalysisImport file={analysisAccess ? null : selectedFile?.blob ?? null} onReview={(access, file, result) => { const filled = draftFromAnalysis(result); setAnalysisAccess(access); setAnalysisDraft(result); setResolutions({}); setSelectedFile({ name: file.name, type: file.type, url: URL.createObjectURL(file), blob: file }); setDraft(filled); setFileError(""); patch({ view: "recognized" }); }} /><div className="muted-panel"><strong>Eine Sicherung wiederherstellen</strong>{pendingRestore?.preferences && <div role="status"><p>Rezepte wurden ergänzt. Die Sicherung enthält auch Plan, Einkauf und Zusatzdaten. Diese können die aktuellen Einstellungen ersetzen.</p><div className="actions"><Action onClick={() => { patch(pendingRestore.preferences!); setPendingRestore(null); setNotice("Plan, Einkauf und Zusatzdaten aus der Sicherung übernommen."); }}>Gesicherte Einstellungen übernehmen</Action><Action onClick={() => setPendingRestore(null)}>Aktuelle Einstellungen behalten</Action></div></div>}<p className="small">Gesicherte Rezepte samt Originaldateien auf diesem Gerät ergänzen.</p><div className="actions preview-action"><label className="button file-label"><Upload size={18} /> Sicherungsdatei auswählen<input type="file" accept="application/json,.json" onChange={(event) => void restoreLocalRecipes(event)} /></label></div></div></>;
  }

  function recognizedView() {
    if (!selectedFile || !analysisDraft) return importView();
    return <RecipeImportReview remote={cloudMode} file={selectedFile} analysis={analysisDraft} draft={draft} onChange={setDraft} resolutions={resolutions} onResolve={setResolutions} onSave={() => void saveRecognized()} onBack={() => patch({ view: "import" })} saving={saving} error={fileError} />;
  }

  function review() {
    const item = recipes[0];
    return <><div className="page-head"><div><p className="eyebrow">Beispielprüfung</p><h1>Alles richtig übernommen?</h1><p className="sub">Künstliche Vorlage und aufbereitete Fassung im Vergleich.</p></div></div><div className="import-grid"><div className="paper"><small>ERFUNDENE VORLAGE · KEIN HOCHGELADENES ORIGINAL</small>{item.sourceText}</div><div><span className="pill">Beispiel · Zutaten und Schritte</span><h2 className="review-title">{item.title}</h2><ul className="ingredients">{item.ingredients.map((ingredient) => <li key={ingredient.id}><span>{ingredient.name}</span><strong>{ingredient.amountText}</strong></li>)}</ul><Action onClick={() => openRecipe(item.id)} primary>Zur Rezeptansicht <ArrowRight size={18} /></Action></div></div></>;
  }

  const activeNav = ["detail", "cook", "import", "recognized", "review"].includes(state.view) ? "library" : state.view;
  return <div className="recipe-app"><div className="app"><header className="topbar"><div className="brand"><span className="brand-mark"><BookOpen size={23} /></span><div className="brand-name"><span>Digitales</span><br />Rezeptbuch</div></div><nav className="topnav" aria-label="Hauptnavigation"><button type="button" aria-current={activeNav === "library" ? "page" : undefined} onClick={() => navigate("library")}><BookOpen size={17} />Rezepte</button><button type="button" aria-current={activeNav === "plan" ? "page" : undefined} onClick={() => navigate("plan")}><CalendarDays size={17} />Wochenplan</button><button type="button" aria-current={activeNav === "shopping" ? "page" : undefined} onClick={() => navigate("shopping")}><ShoppingBasket size={17} />Einkauf<span className="nav-count" aria-hidden="true">{state.adopted ? openShopping.length : 0}</span></button></nav><span className="topnote">{userRecipes.length ? "Lokale Sammlung" : "Beispiel-App"}</span></header><OfflineStatus cooking={state.view === "cook" || selectedFile !== null || state.view === "recognized" || Boolean(manualItem) || pendingRestore !== null || Boolean(state.query)} /><main><SharedHousehold state={state} ready={preferencesReady && preferencesWritable} defaults={initialState} onApply={shared => setState(current => ({ ...current, ...shared }))} />{state.view === "library" ? library() : state.view === "detail" ? detail() : state.view === "cook" ? cook() : state.view === "plan" ? plan() : state.view === "shopping" ? shoppingView() : state.view === "import" ? importView() : state.view === "recognized" ? recognizedView() : review()}</main><footer className="demo-footer"><span>{cloudMode ? "Private Sammlung · bestätigte KI-Rezepte auf deinen Geräten" : "Eigene Rezepte nur auf diesem Gerät · Beispielrezepte klar markiert"}</span><span>{cloudMode ? "Originale und Rezepte regelmäßig zusätzlich sichern" : "Lokale Daten regelmäßig sichern · keine Cloud-Synchronisierung"}</span></footer></div></div>;
}
