# Webversion auf GitHub Pages

Repository: https://github.com/stryker-max/digitales-rezeptbuch

Vorgesehene App-Adresse nach erfolgreicher Veröffentlichung: https://stryker-max.github.io/digitales-rezeptbuch/

GitHub Pages stellt die browserlokale App über HTTPS bereit. Eigene Rezepte, Fotos und PDFs werden dort weiterhin ausschließlich im jeweiligen Browser gespeichert. Die öffentliche Website enthält App-Code und künstliche Beispiele, keine persönliche Sammlung. Auf einem zweiten Gerät gibt es einen eigenen Bestand; Sicherungsdatei bewusst übertragen und importieren. Keine automatische Cloud-Synchronisierung.

Die KI-Abschrift mit lokalem SQLite-/Node-Worker ist im statischen Webbuild ausdrücklich deaktiviert. Es gibt dort keine Server-API und keinen Anbieteraufruf. Sammlung, manuelle Foto-/PDF-Übernahme, Kochen, Tags, importierte Nährwertdaten, Plan, Einkauf, Export/Restore und Offlinepaket bleiben dieselben React-Komponenten wie im lokalen Next.js-Betrieb.

## Technischer Veröffentlichungsweg

`apps/pages` ist ein kleiner zusätzlicher Vite-Client-Einstieg; kein Umbau oder Ersatz des lokalen Next.js-Servers. `npm run build:pages` baut `dist/pages`, setzt den Unterpfad `/digitales-rezeptbuch`, erzeugt Manifest und versionsgebundenen Service Worker. Alle Assetpfade und der Worker-Scope bleiben innerhalb dieses Unterpfads. Standardhost und Next.js-API-Verarbeitung werden nicht verändert. `PAGES_BASE_PATH` kann bei anderem Repositorynamen bewusst angepasst werden.

Auf GitHub unter Settings → Pages die Quelle **GitHub Actions** auswählen. `.github/workflows/pages.yml` prüft, baut und veröffentlicht bei Änderungen an `main`. Private Originale, Schlüssel, SQLite-Dateien, lokale Sicherungen, `work/`, Testausgaben und Buildordner bleiben ausgeschlossen. Normale GitHub-Pages-Adressen sind öffentlich; private Sammlung bedeutet hier lokale Speicherung und keine öffentliche Rezeptdatenbank.

## Prüfungen und Bedienung

```powershell
npm run build:pages
npm run typecheck:pages
npm run test:pages
```

Geprüft im isolierten Chrome-Browser unter echtem Unterpfad: Beispielbild, manuelle Übernahme einer künstlichen PNG-Vorlage, Exportbytes, Offlineprüfung, Neuladen ohne Netzwerk und eigenes Rezept kochen. Keine `/api/`-Anfragen im statischen Betrieb, keine Browserfehler, bei 390 px kein horizontaler Überlauf. Echte Safari-/iPhone-/iPad-Abnahme bleibt offen.

Auf dem iPhone nach erfolgreicher Veröffentlichung in Safari öffnen, über Teilen → Zum Home-Bildschirm hinzufügen. Vor Offline-Nutzung einmal online öffnen und „Offline-Paket prüfen“ verwenden. Browserdaten regelmäßig über „Sammlung sichern“ unabhängig aufbewahren. Lokale Rezepte vom Rechner zunächst exportieren und auf der Webadresse importieren; sie wechseln nicht automatisch auf den neuen Ursprung.

Quellen: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [Vite: GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages), am 27. Oktober 2026 geöffnet. Veröffentlichungserfolg wird separat anhand tatsächlicher GitHub-Deploymentdaten und erreichbarer Website geprüft.
