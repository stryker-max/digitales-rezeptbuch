"use client";
import { useEffect, useState } from "react";
import { listLocalRecipes, sha256 } from "@/lib/local-store";
import { basePath } from "@/lib/deployment";

export function OfflineStatus({ cooking }: { cooking: boolean }) {
  const [online, setOnline] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [update, setUpdate] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Offline-Paket wird vorbereitet …");
  useEffect(() => {
    const network = () => setOnline(navigator.onLine);
    network(); window.addEventListener("online", network); window.addEventListener("offline", network);
    if (process.env.NODE_ENV !== "production") setMessage("Offline-Paket erst im Produktionsbetrieb verfügbar.");
    else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/`, updateViaCache: "none" }).then((reg) => {
        setRegistration(reg); setUpdate(Boolean(reg.waiting));
        reg.addEventListener("updatefound", () => reg.installing?.addEventListener("statechange", () => setUpdate(Boolean(reg.waiting))));
        setMessage("Offline-Paket prüfen, um die Verfügbarkeit zu bestätigen.");
        void navigator.serviceWorker.ready.then((active) => { setRegistration(active); setReady(true); });
      }).catch(() => setMessage("Offline-Paket konnte nicht geladen werden. Internetverbindung und Speicher prüfen."));
    } else setMessage("Dieser Browser unterstützt das Offline-Paket nicht.");
    return () => { window.removeEventListener("online", network); window.removeEventListener("offline", network); };
  }, []);
  async function verify() {
    setMessage("Prüfe App und lokale Originale …");
    try {
      const reg = registration;
      const worker = navigator.serviceWorker.controller ?? reg?.active;
      if (!worker) throw new Error();
      const complete = await new Promise<boolean>((resolve, reject) => {
        const channel = new MessageChannel();
        const timeout = window.setTimeout(() => { channel.port1.close(); reject(new Error()); }, 10000);
        channel.port1.onmessage = (event) => { clearTimeout(timeout); channel.port1.close(); resolve(event.data.complete === true); };
        worker.postMessage("CHECK", [channel.port2]);
      });
      if (!complete) throw new Error();
      const recipes = await listLocalRecipes();
      for (const recipe of recipes) if (await sha256(recipe.sourceBlob) !== recipe.sourceHash) throw new Error();
      const persistent = await navigator.storage?.persist?.().catch(() => false);
      setMessage(`Offline geprüft: App und ${recipes.length} eigene Rezepte samt Originalen lesbar. ${persistent ? "Beständiger Speicher gewährt." : "Browser kann Speicher freigeben."} Regelmäßig sichern.`);
    } catch { setMessage("Offline-Verfügbarkeit nicht bestätigt. Speicher und App-Paket prüfen; Sammlung sichern."); }
  }
  return <aside className="offline-status" aria-label="Verbindung und Offline-Speicher"><p role="status">{online ? "Online" : "Offline · lokaler Bestand"} · {message}</p><div className="actions">{ready && <button className="button" onClick={() => void verify()}>Offline-Paket prüfen</button>}{update && <button className="button" disabled={cooking} onClick={() => { navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true }); registration?.waiting?.postMessage("ACTIVATE"); }}>Update laden{cooking ? " · nach dem Kochen" : ""}</button>}</div></aside>;
}
