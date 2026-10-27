# Digitales Rezeptbuch

**Lokale App in Entwicklung · 27. Oktober 2026 · Weiterbau ab `1988cd5`**

Next.js-/React-App für eigene Foto-/PDF-Rezepte, Originalvergleich, Kochen, Wochenplan und Einkauf. Navy-/Blau-Oberfläche mit großen Schaltflächen und festen Kochpfeilen. Lokal benutzbar und als browserlokale Webversion veröffentlicht; noch keine fertig abgenommene Cloud-Anwendung mit geräteübergreifender Sammlung.

## App öffnen

**[Digitales Rezeptbuch starten](https://stryker-max.github.io/digitales-rezeptbuch/)**

Auf dem iPhone in Safari öffnen und über **Teilen → Zum Home-Bildschirm** hinzufügen. Neue Rezepte über „Rezept hinzufügen“ selbst aus Foto/PDF übertragen. Vorhandene lokale Sammlung zuerst sichern und auf dieser Webadresse importieren. Eigene Rezepte bleiben im jeweiligen Browser; regelmäßig „Sammlung sichern“ verwenden.

Die [GitHub-Pages-Webversion](docs/GITHUB-PAGES.md) enthält App-Code und künstliche Beispiele. KI-Abschrift benötigt weiterhin einen gesonderten Server; die Webversion bietet manuelle Übernahme. Keine automatische Cloud-Synchronisierung.

## Starten

Node.js **24 oder neuer**, npm. Im Projektordner:

```powershell
npm ci
npm run dev
```

Öffnen: `http://127.0.0.1:3000`. Für Offline-Nutzung stattdessen Produktionsbetrieb:

```powershell
npm run build
npm start
```

**Adresse, Port und Browserprofil beibehalten.** `localhost`, `127.0.0.1` und verschiedene Ports besitzen getrennte lokale Bestände. Vor Entwicklung am selben Ursprung einen registrierten Produktions-Service-Worker abmelden; keine Rezeptdaten löschen. Entwicklungs- und Produktionsserver nicht gleichzeitig auf gleichem Port starten.

## Implementierter Stand

- Sammlung, Titel-/Zutaten-/Tag-/Abschriftsuche, Favoriten. Automatische korrigierbare Tags mit Beleg und Regelversion; keine automatisch zugesicherten Ernährungs-/Allergenmerkmale.
- Manuelle Übernahme eines Fotos/PDFs mit Originalvergleich und Nutzerbestätigung. Originalbytes und SHA-256 in IndexedDB. HEIC/HEIF manuell aufbewahrbar, aber noch keine verlässlich getestete Vorschau/Konvertierung.
- Große Kochansicht: Utensilien, Zutaten, Überblick, Schritte, Originalabschrift und fester Abschluss. Letzten Kochstand wieder aufnehmen. Rezept-IDs bezeichnen unveränderliche Fassungen; Bearbeitungs-/Versionsoberfläche noch offen.
- Manuelle, automatische und gemischte Wochenplanung, je ein Rezept pro Tag, automatische Einkaufsliste. Ohne bekannte Portionsbasis ausdrücklich **Rezeptmengen**. Gleicher Faktor in Planung, Einkauf und Kochzutaten; Originalzeiten/-temperaturen bleiben unverändert.
- g/kg/dag und ml/l zusammenrechnen, Brüche lesen, offene Mengen erhalten. Gekaufte Mengen bleiben bei Planänderung berücksichtigt. Freie Einkaufsposten ergänzen/abhaken. Offene Mengen bleiben „Menge prüfen“ und sind noch nicht mengenmäßig abhakbar. Verwaiste Kaufzuordnungen bleiben gespeichert, haben noch keine eigene Anzeige.
- **Sicherung v2** mit eigenen Rezepten, Originalbytes/Hash, vorhandener KI-Abschriftsherkunft, Plan/Einkauf, eigenen Positionen, Favoriten, Checklisten/Kochposition, Tagkorrekturen, Lebensmittelkatalog und Zuordnungen. Alte v1-Dateien bleiben lesbar. Abweichende Inhalte unter gleicher Rezept-ID blockieren den Import. Einstellungen erst nach ausdrücklicher Übernahme ersetzen.
- **Offline im Produktionsbetrieb:** versionsgebundene App-Dateien im Service Worker, Rezepte/Originale in IndexedDB, Einstellungen im lokalen Speicher. „Offline-Paket prüfen“ liest App-Dateien und prüft alle gespeicherten Original-Hashes. Updates werden angeboten; Updateaktion ist im Kochmodus deaktiviert. Browser kann Speicher trotzdem löschen; regelmäßig unabhängig sichern.
- **Nährwertrechnung:** versionierten Lebensmittelkatalog laden und passende Datensätze je Zutat wählen, danach automatische deterministische Rechnung. Quellen/Zustand/Version/Lizenz und Rechenweg sichtbar. Fehlende Werte bleiben unvollständige Teilsummen; keine erfundenen KI-Werte oder pauschalen ml-/Stückfaktoren. Ein echter BLS-/USDA-Bestand und sichere automatische Zuordnung sind noch nicht enthalten. [Katalogformat](docs/LEBENSMITTELKATALOG.md).
- **Optionaler echter KI-Abschriftpfad:** persistente SQLite-Jobs, separater Worker mit Responses-API, Quellblöcke/Lesefragen, serverseitige Freigabe. Der Nutzer strukturiert die erkannte Abschrift selbst in Zutaten/Schritte; automatische strukturierte Extraktion und Feld-zu-Block-Zuordnung sind noch offen. [Einrichtung](docs/LOKALER-BETRIEB.md).

Vier vorinstallierte Rezepte und deren KI-Bilder sind ausdrücklich künstliche Beispiele. Automatische Wochenvorschläge berücksichtigen aktuell auch diese klar markierten Beispiele. Harte Ausschlüsse, Zeitfilter und ein reiner Eigene-Rezepte-Modus sind noch offen.

## Optionale KI aktivieren

`apps/web/.env.example` nach `apps/web/.env.local` kopieren. API-Schlüssel, geeignetes Bildmodell mit Structured Outputs, absoluten privaten Datenordner und `LOCAL_ANALYSIS_ENABLED=true` setzen. Webserver neu starten; zweites Terminal:

```powershell
npm run worker
```

Ohne diese Konfiguration gibt es keinen Demo-Fallback. Für KI unterstützt: JPEG/PNG/WebP bis 20 Millionen Pixel sowie PDF mit 1–10 Seiten eines einzelnen Rezepts, bis 25 MB. HEIC im KI-Pfad noch nicht unterstützt. Bilder werden als getrennte orientierte Kopie ohne EXIF übertragen; PDF nach Prüfung vollständig. Vor Start muss der Nutzer die Übertragung an OpenAI ausdrücklich wählen.

Standardlimit: fünf atomar reservierte Anbieteraufrufe je UTC-Tag; **kein Euro-Monatsbudget**. Nach unklarem Abbruch keine automatische kostenpflichtige Wiederholung. Worker muss tatsächlich laufen. Lokaler Host-/Ursprungsschutz und geheimer Zugriffscode je Job ersetzen keine Cloud-Anmeldung/RLS. Nicht per Tunnel oder Proxy veröffentlichen. In dieser Weiterentwicklung wurden keine echten Rezepte an OpenAI geschickt und keine bezahlte Analyse getestet.

## Sichern und Gerätewechsel

„Sammlung sichern“ lädt eine unverschlüsselte private JSON-Datei. Unabhängig aufbewahren. Auf Zielgerät über „Rezept hinzufügen → Sicherungsdatei auswählen“ importieren; neue Rezepte werden ergänzt. „Gesicherte Einstellungen übernehmen“ ersetzt dortigen Plan/Einkauf/Metadaten mit dem Sicherungsstand. Das ist bewusste Dateiübertragung, keine automatische Gerätesynchronisierung.

Maximal 100 Rezepte, 25 MB je Original und 100 MB Sicherungsdatei. Lokale Analysejobs/SQLite-Originale separat sichern; wartende Jobs sind nicht im Sammlungsexport. Bestätigte, lokal gespeicherte Analyseherkunft ist enthalten. Vor Browserbereinigung oder Gerätewechsel zuerst sichern.

## Prüfungen

```powershell
npm test
npm run typecheck
npm run typecheck:worker
npm run build
npm run test:e2e
```

Browsertests: isolierte Chrome-Profile, Produktionsserver auf Ports 3118/3119; Chrome muss installiert sein. Der zweite Server verwendet ausschließlich synthetische Analysekonfiguration ohne Anbieteraufruf. Echte iPhones/iPads und Home-Bildschirm-Betrieb sind separat offen. [Prüfbericht](docs/PRUEFBERICHT-2026-10-27.md). Auf diesem Windows-System braucht der Produktionsbuild normale Dateirechte. Webpack vermeidet die hier fehlgeschlagene Turbopack-Verzeichnisverknüpfung.

## Nächste Schritte

1. Echte autorisierte KI-Testquellen und Anbieterbudget; strukturierte Extraktion, Herkunft je Feld, Versionsbearbeitung und geprüfte HEIC-Aufbereitung ergänzen.
2. Echten versionierten Lebensmittelkatalog samt Lizenz importieren, sichere automatische Zuordnung und belegte Faktoren ergänzen.
3. Eigentümerkonto, private serverseitige Sammlung, RLS für Tabellen/Dateien, konfliktgeschützte Gerätesynchronisierung und unabhängige Sicherungen bauen und mit zwei Konten prüfen. Bestehende lokale Bestände erst exportieren und nach validierter Migration übernehmen.
4. Echte iPhone-/iPad-Abnahme einschließlich Kamera, Offline/Updates, Speicher, VoiceOver, Timer und Wake Lock.
5. Danach die vollständige private Cloud mit Analyseserver und Sicherung einrichten. Die browserlokale Webversion ist bereits per HTTPS auf GitHub Pages veröffentlicht; eine produktive geräteübergreifende Rezeptdatenbank ist noch nicht eingerichtet.

Weitere offene Zielpunkte: Wochen-/Datumsverwaltung, mehrere Mahlzeitkomponenten/Chargen, Resteverteilung, Vorratszuordnung, verwaiste Käufe, Druckansicht, Papierkorb, Kochhistorie und Konflikte zwischen gleichzeitig bearbeitenden Browserfenstern.

## Vollständiger Bauvertrag

[Konzept](docs/KONZEPT.md) · [Architektur](docs/ARCHITEKTUR.md) · [Rezepttreue](docs/REZEPTTREUE.md) · [Umsetzung](docs/UMSETZUNG.md) · [Abnahme](docs/ABNAHME.md) · [Planung/Nährwerte](docs/PLANUNG-UND-NAEHRWERTE.md) · [Design](docs/DESIGN.md) · [Projektregeln](AGENTS.md).

Diese Dokumente beschreiben das vollständige Ziel. [ARCHITEKTUR-IST.md](docs/ARCHITEKTUR-IST.md) erklärt den Zwischenstand und die Migration; Zielvorgaben sind dadurch nicht automatisch abgenommen.
