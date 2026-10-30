"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/remote-api";
import { remoteApiBase } from "@/lib/deployment";
import { emptyHousehold, mergeHousehold, parseHousehold, type HouseholdState } from "@/lib/household";

const key = "digitales-rezeptbuch-shared-queue-v1";
type Remote = { version: number; state: HouseholdState };
type Queue = { version: number; base: HouseholdState; target: HouseholdState; conflict?: Remote };
const pick = (value: HouseholdState): HouseholdState => ({ plan: value.plan, adopted: value.adopted, purchased: value.purchased, manualItems: value.manualItems });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function SharedHousehold({ state, ready, defaults, onApply }: { state: HouseholdState; ready: boolean; defaults: HouseholdState; onApply: (state: HouseholdState) => void }) {
  const current = useRef(pick(state)), apply = useRef(onApply), queue = useRef<Queue | null>(null), ignored = useRef("");
  const run = useRef<() => void>(() => {}), running = useRef(false), [conflict, setConflict] = useState(false), [message, setMessage] = useState("");
  current.current = pick(state); apply.current = onApply;
  function persist() { if (queue.current) { try { localStorage.setItem(key, JSON.stringify(queue.current)); } catch { setMessage("Änderungen sind lokal gespeichert. Der Geräteabgleich konnte nicht vorgemerkt werden."); } } }
  function accept(value: HouseholdState) { ignored.current = JSON.stringify(value); current.current = value; apply.current(value); }
  const signature = JSON.stringify(pick(state));
  useEffect(() => {
    if (!ready || !remoteApiBase) return;
    let stopped = false;
    try {
      const cached = JSON.parse(localStorage.getItem(key) ?? "null"), base = parseHousehold(cached?.base), target = parseHousehold(cached?.target);
      if (base && target && Number.isInteger(cached.version) && cached.version >= 0) {
        queue.current = { version: cached.version, base, target, ...(cached.conflict && parseHousehold(cached.conflict.state) ? { conflict: cached.conflict } : {}) };
        // Latest local preferences may include edits saved just before a reload.
        if (!same(current.current, target)) accept(target);
        setConflict(Boolean(queue.current.conflict));
      }
    } catch { /* Local preferences remain the independent copy. */ }
    async function sync() {
      if (stopped || running.current || document.visibilityState === "hidden" || !navigator.onLine) return;
      if (queue.current?.conflict) return;
      running.current = true;
      try {
        const pending = queue.current, sent = pending ? structuredClone(pending.target) : null;
        const dirty = pending && !same(pending.base, pending.target);
        const response = await apiFetch("/api/household", dirty ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: pending.version, state: sent }) } : { cache: "no-store" });
        const data = await response.json(); if (stopped) return;
        if (!response.ok && response.status !== 409) throw new Error();
        if (!Number.isInteger(data.version) || data.version < 0 || (data.state !== null && !parseHousehold(data.state))) throw new Error();
        const remote: HouseholdState = data.state ?? emptyHousehold();
        if (!queue.current) {
          const local = current.current;
          if (!data.state) queue.current = { version: 0, base: emptyHousehold(), target: same(local, pick(defaults)) ? emptyHousehold() : local };
          else if (same(local, pick(defaults)) || same(local, emptyHousehold())) { queue.current = { version: data.version, base: remote, target: remote }; accept(remote); }
          else {
            const merged = mergeHousehold(emptyHousehold(), local, remote, true);
            queue.current = { version: data.version, base: remote, target: merged.state, ...(merged.conflicts.length ? { conflict: { version: data.version, state: remote } } : {}) };
            if (!merged.conflicts.length) accept(merged.state);
          }
          if (!data.state && same(local, pick(defaults))) accept(emptyHousehold());
        } else {
          const q = queue.current;
          const before = dirty && sent && response.ok ? sent : q.base;
          const merged = mergeHousehold(before, q.target, remote, true);
          q.version = data.version; q.base = remote; q.target = merged.state;
          if (response.status === 409 || merged.conflicts.length) q.conflict = { version: data.version, state: remote };
          else accept(merged.state);
        }
        persist(); setConflict(Boolean(queue.current?.conflict)); setMessage("");
        if (queue.current && !queue.current.conflict && !same(queue.current.base, queue.current.target)) setTimeout(() => void sync(), 500);
      } catch { if (!stopped) setMessage("Änderungen sind auf diesem Gerät gespeichert. Der gemeinsame Stand wird bei Verbindung abgeglichen."); }
      finally { running.current = false; }
    }
    run.current = () => { void sync(); };
    const visible = () => { if (document.visibilityState === "visible") void sync(); };
    void sync(); const timer = window.setInterval(() => void sync(), 30000);
    window.addEventListener("online", visible); window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener("online", visible); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [ready]);
  useEffect(() => {
    if (!ready || !remoteApiBase || !queue.current) return;
    if (ignored.current === signature) { ignored.current = ""; return; }
    queue.current.target = current.current; persist();
    const timer = window.setTimeout(() => run.current(), 500); return () => clearTimeout(timer);
  }, [signature, ready]);
  if (!remoteApiBase) return null;
  if (conflict) return <section className="muted-panel household-conflict" role="status"><h2>Ihr habt gleichzeitig etwas geändert</h2><p>Deine Änderung ist gespeichert. Welchen Stand möchtet ihr für den betroffenen Plan oder Einkauf verwenden?</p><div className="actions">
    <button className="button" onClick={() => { if (!queue.current?.conflict) return; queue.current.base = queue.current.conflict.state; queue.current.version = queue.current.conflict.version; delete queue.current.conflict; accept(queue.current.target); persist(); setConflict(false); run.current(); }}>Meine Änderung übernehmen</button>
    <button className="button" onClick={() => { if (!queue.current?.conflict) return; const remote = queue.current.conflict; queue.current = { version: remote.version, base: remote.state, target: remote.state }; accept(remote.state); persist(); setConflict(false); run.current(); }}>Gemeinsamen Stand verwenden</button>
  </div></section>;
  return message ? <p className="sync-note" role="status">{message}</p> : null;
}
