"use client";
import { useEffect, useRef, useState } from "react";
import { basePath } from "@/lib/deployment";

// Keep application files ready in the background. Never interrupt a form or cooking.
export function OfflineStatus({ cooking }: { cooking: boolean }) {
  const [online, setOnline] = useState(true), safe = useRef(!cooking), pending = useRef<ServiceWorkerRegistration | null>(null);
  safe.current = !cooking;
  useEffect(() => {
    let stopped = false, activating = false, newerFiles = false;
    let controlled = Boolean(navigator.serviceWorker?.controller);
    const network = () => setOnline(navigator.onLine);
    const activate = () => {
      if (!safe.current || activating || !pending.current?.waiting || document.visibilityState !== "visible" || document.querySelector('.account-settings, form:focus-within')) return;
      activating = true; pending.current.waiting.postMessage("ACTIVATE");
    };
    const changed = () => { const replaced = controlled; controlled = true; if (activating && !stopped && safe.current) location.reload(); else if (replaced) newerFiles = true; };
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      if (newerFiles && safe.current && !document.querySelector('.account-settings, form:focus-within')) { activating = true; location.reload(); return; }
      activate();
    };
    network(); window.addEventListener("online", network); window.addEventListener("offline", network);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("controllerchange", changed);
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/`, updateViaCache: "none" }).then(registration => {
        if (stopped) return;
        if (registration.waiting) { pending.current = registration; activate(); }
        registration.addEventListener("updatefound", () => registration.installing?.addEventListener("statechange", () => { if (registration.waiting) pending.current = registration; }));
      }).catch(() => { /* Local recipes remain usable; do not promise offline files. */ });
      window.addEventListener("focus", resume); document.addEventListener("visibilitychange", resume);
    }
    return () => { stopped = true; window.removeEventListener("online", network); window.removeEventListener("offline", network); window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); navigator.serviceWorker?.removeEventListener("controllerchange", changed); };
  }, []);
  return !online ? <aside className="offline-status" role="status">Ohne Internet · Gespeicherte Rezepte bleiben verfügbar.</aside> : null;
}
