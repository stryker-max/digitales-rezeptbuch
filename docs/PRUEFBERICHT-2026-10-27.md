# Prüfbericht — 27. Oktober 2026

Weiterbau ab Commit `1988cd5`, anfänglich sauberes Arbeitsverzeichnis. Lokale Entwicklungsfassung, keine produktive oder vollständige Abnahme. Sämtliche neuen Testquellen sind künstlich; keine privaten Originalrezepte wurden gelesen, hochgeladen oder in Git aufgenommen. Vorhandene persönliche Browserprofile wurden nicht geöffnet oder bereinigt.

## Umgebung und ausgeführte Prüfungen

Windows, Node.js 24.18.0, npm 11.16.0, Next.js 16.4.3, React 19.3.1, TypeScript 5.9.3. Playwright 1.64.1 mit installiertem Google Chrome 155.0.8059.86 und getrennten Browserkontexten. Produktions-Testserver auf Loopback-Ports 3118 und 3119, zweiter Server ausschließlich mit synthetischer Konfiguration und privatem Testordner unter `work/`. Kein Anbieter-Worker wurde dabei gestartet, kein externer KI-Aufruf durchgeführt.

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| `npm test` | **21/21 bestanden** |
| `npm run typecheck` | bestanden |
| `npm run typecheck:worker` | bestanden |
| `npm run build` | bestanden; Webpack-Produktionsbuild, Offlinepaket mit 25 versionsgebundenen JS-/CSS-/Fontdateien plus Startseite/Manifest/Symbolen/Beispieldarstellung |
| `npm run test:e2e` | **7/7 bestanden**, letzter vollständiger Lauf am abschließenden Produktionsbuild, 13,9 Sekunden |
| `git diff --check` | bestanden; ausschließlich Zeilenendenhinweise |

Paketversionen einschließlich neuem Sharp/pdf-lib/Playwright sind im Manifest und Lockfile festgeschrieben. Installation meldete keine bekannten Paketlücken. Es ist keine unabhängige Sicherheitsaudit-Abnahme daraus abgeleitet.

## Nachgewiesene Funktionen

- Originalbytes/SHA-256 und bestätigten Text durch Export/Wiederimport erhalten; manipulierte Originale beim Export und Import abweisen. v1 bleibt lesbar, v2 erhält Plan, Kaufmengen, freie Positionen, persönliche Tags und Analyseherkunft. Gleiche ID mit geänderten Zutaten gilt als Konflikt.
- Browserablauf mit künstlichem PNG: manuell übernehmen, Tags korrigieren, als Rezeptmenge einplanen, Einkauf übernehmen, 500 g gekauft markieren, Bedarf auf 1000 g erhöhen → 500 g offen; freie Position bleibt erhalten. Anschließend Archivbytes prüfen und auf leerem Browserkontext wiederherstellen.
- App-Paket und eigene Originaldatei vor Offlinebestätigung tatsächlich lesen und Hash prüfen. Netzwerk im Browser abschalten, vollständig neu laden, eigenes Rezept öffnen und kochen. Kochposition über erneutes Offline-Neuladen wieder aufnehmen.
- Alle acht Ansichten des künstlichen Kürbissuppen-Beispiels vorwärts durchlaufen: beide Pfeilrechtecke bei jeweils 320, 390, 768 und 1024 px exakt unverändert. Kein horizontaler Seitenüberlauf; Weiter bleibt am Abschluss vorhanden und deaktiviert. Abschluss bei 390 px zusätzlich als Screenshot visuell geprüft: Navy-Design, große Pfeile, „Fertig gekocht. Guten Appetit!“.
- Persistente lokale Auftragstabelle: erneute Anlage gleicher Kennung dedupliziert, fremder Zugriffscode abgewiesen, tägliche Aufrufreservierung begrenzt. Späte Ergebnisse nach Abbruch werden nicht veröffentlicht; verwaiste laufende Aufträge erhalten Fehlerstatus und werden nicht automatisch neu an den Anbieter gesendet.
- Vollständiger lokaler API-/Browserpfad mit **synthetisch eingespeister Abschrift**, nicht mit echter KI: gültiges PNG gesichert, SQLite-Auftrag von zweiter Verbindung verarbeitet, Serverfreigabe bei offener Lesefrage abgewiesen, Nutzerklärung im Browser eingegeben, serverseitig unveränderlich bestätigt, lokal gespeichert. Serveroriginal danach bytegleich abgerufen. Bestätigung ist idempotent; nachträglich veränderte Freigabedaten ersetzen keine bestätigte Fassung.
- Unbekannte/duplizierte Quellblock-IDs und Seiten außerhalb der Quelle abweisen. Falsche Bild-MIME-Signatur und PDF mit elf Seiten abweisen; separate Bildarbeitskopie ohne EXIF prüfen. Nicht eingerichtete Analyse liefert keinen Demo-Erfolg, fremder Ursprung darf nicht schreiben.
- Nährwertrechnung mit ausdrücklich künstlichem Datensatz: 250 g × 100 kcal/100 g = 250 kcal. Fehlender Fettwert bleibt unvollständig; ml ohne Faktor ergibt unbekannte Grammmenge. Fehlende Provenienz und negative Werte im Katalog werden abgewiesen. Fleisch/Gemüse-Tags können gleichzeitig auftreten, ohne vegetarisch/allergenfrei zu behaupten.
- Gramm-/Kilogramm-/dag- und ml/l-Basiseinheiten, Brüche, offene Mengen und Rezeptmengen ohne Portionsbasis geprüft. Bereits gespeicherte kg-Käufe werden ohne Verlust zu g überführt. Originaleinheiten/-text bleiben bestehen.

## Grenzen der Nachweise

Die Browserprüfung beobachtet das Downloadereignis und prüft die tatsächlich erzeugten Blob-Archivbytes einschließlich Wiederimport. Das Kopieren der temporären Chrome-Downloaddatei durch Playwright scheiterte in dieser Windows-Umgebung an `EPERM`; eine erfolgreich auf einen beliebigen Betriebssystem-Zielpfad kopierte Datei wird hier **nicht** als geprüft behauptet.

Der erste Turbopack-Build scheiterte an einer Windows-Verzeichnisverknüpfung. Der Webpack-Build beseitigte diese Abhängigkeit; die eingeschränkte Ausführung scheiterte anschließend beim Anlegen interner Buildordner. Der abschließende Build und die Browserprüfungen liefen mit normalen Windows-Datei-/Prozessrechten erfolgreich. Es gab keine Änderung an globaler Git-Konfiguration.

Kein echter Anbieteraufruf, keine Bewertung von Handschriftqualität, keine 20 autorisierten Originaltestquellen. Die KI-Abschrift ist ein implementierter optionaler Integrationspfad; automatische strukturierte Extraktion, Herkunft je Rezeptfeld und vollständige Quelldeckungsprüfung fehlen. Der Server kann die Richtigkeit einer menschlichen Prüfung nicht beweisen.

Kein echter Lebensmittelkatalog, kein nachgewiesener automatischer BLS-Import und keine sichere automatische Lebensmittelzuordnung. Die Nährwertrechnung benötigt bewusste Zuordnung zu importierten Daten. Keine Garverlust-/Dichte-/Stückfaktoren. Vollständige Ernährungsmerkmale werden nicht abgeleitet.

Keine Cloudanmeldung/RLS, keine automatische Gerätesynchronisierung, keine produktive Veröffentlichung, keine automatische unabhängige Datenbanksicherung. Gegenwärtige Zugriffstests prüfen lokale Auftragszugriffscodes, **nicht** die geforderten zwei unabhängigen Cloudkonten. Keine Konfliktprüfung für gleichzeitiges Bearbeiten lokaler Einstellungen in mehreren Fenstern.

Keine echten iPhone-/iPad-Tests, Safari-Installation, Kamera/HEIC, VoiceOver, 200-%-Schriftabnahme, Timer-/Wake-Lock-/Sperrverhalten. Vier Browserbreiten ersetzen das nicht. U14 ist nur für die beschriebenen Vorwärtsdurchläufe nachgewiesen, nicht für die gesamte Geräte-/Ausrichtungs-/Schriftgrößenmatrix. Große Sammlungen, Resteverteilung/Chargen, Papierkorb und unabhängige Komplett-Rücksicherung bleiben offen.

## Nächste Umsetzung und Git-Stand

Zuerst KI-Integration mit freigegebenen Quellen/Anbieterbudget und strukturierter Herkunft vervollständigen, echten Lebensmittelkatalog anbinden; danach Eigentümerkonto, private serverseitige Sammlung/RLS und konfliktgeschützte Gerätesynchronisierung. Bestehende lokale Bestände vor jeder Cloudmigration exportieren und Hash-/Beziehungsprüfung in leerer Umgebung durchführen. Veröffentlichung erst mit diesen Grundlagen und echter Geräteabnahme.

Änderungen liegen im Arbeitsverzeichnis, **kein neuer Commit**: weder lokale noch globale Git-Autorenidentität ist eingerichtet. Es wurde keine fremde Identität erfunden. HEAD bleibt `1988cd5`. Private Daten, `work/`, Testausgaben und generierter Service Worker sind ausgeschlossen. README, Architektur-Ist, Betriebsanleitung und Katalogformat beschreiben den tatsächlichen Stand.

## Nachtrag: beauftragte Veröffentlichung auf GitHub

Auf den anschließenden ausdrücklichen Nutzerauftrag wurde ein öffentlicher GitHub-Pages-Build ergänzt und veröffentlicht. Repository `stryker-max/digitales-rezeptbuch`, erster veröffentlichter Commit `33760f5`; der gesamte hochgeladene Git-Baum stimmt mit dem lokalen Index überein (`03b5f43e52f78f1d8ef09d857cd67b07b33db7e7`). Commit wurde über die verbundene GitHub-Identität erstellt; keine fremde lokale Autorenidentität oder globale Konfiguration gesetzt. Lokal folgt `github-main` dem GitHub-Branch; der bisherige lokale Branch `main` und seine Historie ab `1988cd5` bleiben erhalten.

Zusätzlich bestanden: statischer Produktionsbuild mit Vite 8.3.5, eigene Pages-Typprüfung und Browserdurchlauf unter `/digitales-rezeptbuch/`: Bilder, synthetische manuelle Übernahme, Archivbytes, Offlineprüfung und eigenes Kochen nach Neuladen ohne Netzwerk; keine API-Anfragen, Browserfehler oder horizontaler Überlauf bei 390 px. GitHub führte Installation, alle 21 Tests, Pages-Typprüfung, Build und Veröffentlichung erfolgreich aus. Echte HTTPS-Adresse im angemeldeten Benutzerbrowser geöffnet und Offlinepaket geprüft. Keine persönlichen Rezepte an GitHub übertragen, KI im statischen Build ausdrücklich deaktiviert. Details und Link in [GITHUB-PAGES.md](GITHUB-PAGES.md).
