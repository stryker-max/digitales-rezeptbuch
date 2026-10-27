# Implementierte Architektur und Migration

Stand 27. Oktober 2026, Weiterbau ab `1988cd5`. Der vollständige Cloud-Bauvertrag bleibt gültig. Die lokale Umsetzung ersetzt dessen Zugriffs-, Qualitäts- und Geräteabnahme nicht.

## Bestand bewahren

Die bestehende App speicherte Original-Blobs und eigene Rezepte in IndexedDB `digitales-rezeptbuch-local-v1`, Store `recipes`, Version 1. Name, Store und Version bleiben gleich; bestehende Datensätze werden weder geändert noch gelöscht. Neue Fassungen werden nur eingefügt. Keine Operation überschreibt bestätigten Inhalt. Vollständige Versionsbearbeitung fehlt noch.

`digitales-rezeptbuch-preferences-v1` bleibt der localStorage-Schlüssel. Neue Felder bekommen beim Lesen alter Daten leere Standardwerte. kg-/dag-/l-Kaufmengen werden in zugehörige Basiseinheiten überführt. Originalmengen bleiben unverändert. Ohne bekannte Portionszahl verwendet der Plan ausdrücklich Rezeptmengen; derselbe Faktor gilt bei Einkauf und Kochzutaten.

Sicherung v2 erweitert v1 um Einstellungen und optionale Analyseherkunft. Alle Einträge und Original-Hashes werden vor dem Einfügen geprüft; Einfügen neuer Rezepte erfolgt in einer IndexedDB-Transaktion. ID-Konflikte auch bei abweichenden Zutaten/Schritten werden abgewiesen. Einstellungen ersetzt der Nutzer in einem sichtbaren zweiten Schritt. Das ist keine atomare Gerätesynchronisierung. Bereits vorhandene persönliche Browserprofile wurden nicht geöffnet oder bereinigt; Tests laufen mit isolierten Profilen und synthetischen Daten.

## Offline

Nach dem Next-Build erzeugt `scripts/build-offline.mjs` einen Service Worker mit Build-ID und Liste aller JS-/CSS-/Fontdateien, Manifest, Symbolen und Beispieldarstellung. Installation lädt das komplette Paket; Installationsfehler verwerfen das neue Cachepaket. Alte Pakete werden erst bei Aktivierung entfernt. Aktive alte Clients verhindern reguläre sofortige Aktivierung. Bewusste Updateaktion ist beim Kochen deaktiviert.

Nur bekannte App-Dateien und Navigation auf `/` werden bedient; keine API-, RSC- oder persönlichen Daten im gemeinsamen Shellcache. Originale bleiben in IndexedDB. Prüfung liest alle App-Dateien und Originale samt Hash und fordert optional beständigen Speicher an; sie verspricht keine unabhängige Sicherung. Im lokalen Zwischenstand steht der gesamte Browserbestand offline bereit; gezielte Cloudpakete mit Kontentrennung kommen später. Anmeldung und Logout gibt es noch nicht.

## Lokaler Analysepfad

Webserver und eigenständiger Node-Worker teilen eine private SQLite-Datei mit WAL und Transaktionen. Zustände: `queued → processing → needs_review → confirmed`, außerdem `failed`/`cancelled`. Größe/Signatur, Bildformat/-fläche und PDF-Seitenzahl werden geprüft; beschädigte/verschlüsselte PDFs abgewiesen. Originalbytes bleiben erhalten. Bildarbeitskopien werden mit Sharp orientiert, verkleinert und von EXIF befreit. PDF geht nach pdf-lib-Prüfung vollständig an den Anbieter; eingebettete Inhalte werden lokal nicht ausgeführt.

Loopback-/Ursprungsschutz und zufälliger Zugriffscode je Auftrag; serverseitig nur dessen Hash. Einzelinstanz für lokale Entwicklung, kein Mehrnutzersystem und kein RLS-Ersatz. Server per Skript an `127.0.0.1` gebunden; keine Veröffentlichung per Tunnel/Proxy.

Ein Worker reserviert Auftrag und Tagesaufruf atomar mit `BEGIN IMMEDIATE`; höchstens drei offene und 100 gespeicherte Jobs. Pro Auftrag ein Anbieteraufruf, Timeout 180 Sekunden. Verwaiste Verarbeitung wird nach fünf Minuten beim nächsten Worker-Durchlauf als Fehler markiert. Keine automatische Wiederholung unklar berechneter Anfragen. Abbruch verhindert spätere Ergebnisveröffentlichung. Tagesaufruflimit ist kein Monatskostenbudget. Für Cloud bleibt PostgreSQL/Worker mit Eigentümerprüfung, Budgetreservierung und Leases der Zielweg.

Responses-API mit `store:false`, ohne Werkzeuge/URL-Nachladen, versioniertem Prompt und gemeinsamem Schema für vollständige blockweise Abschrift, Seiten und Lesefragen. Nutzer strukturiert diese selbst; automatische Zutaten-/Schrittextraktion und Herkunft je Feld fehlen noch. Ungeprüfte Abschrift, Modell-/Promptversion und Entscheidungen bleiben separat erhalten. Server prüft Pflichtfelder, Zustand und jede Lesefrage vor Freigabe; bestätigte Fassung wird unveränderlich gespeichert. Formale Prüfungen beweisen weder Handschriftrichtigkeit noch Vollständigkeit der Nutzerbearbeitung.

## Metadaten

Automatische Tags: versionierte Titel-/Zutatenregeln mit Belegen, persönliche Overrides getrennt vom Rezept. Keine automatisch behaupteten Ernährungs-/Allergenmerkmale. Automatische Regeln haben noch keine eigene historische Revisionsablage; aktuelle Regelversion und Belege sind sichtbar, persönliche Overrides gesichert.

Nährwerte: bewusst gewählte Lebensmittel/Zustände aus importiertem Katalog mit Quelle, Version, Lizenz. Automatische Rechnung für g/kg/dag, separate Vollständigkeit je Nährstoff; pro Portion nur bei vollständigem Nährstoff und bekannter Portionszahl. Keine pauschalen Dichte-/Stückfaktoren, Garverlustrechnung oder erfundenen Werte. Echter Katalog und automatische sichere Zuordnung fehlen noch.

## Dokumentationsquellen

Am 27. Oktober 2026 geöffnet: [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [OpenAI File Inputs](https://developers.openai.com/api/docs/guides/file-inputs), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Keine Modellqualitätsbewertung daraus abgeleitet.
