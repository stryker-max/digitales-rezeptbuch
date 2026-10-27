# Lokaler Betrieb und automatische Foto-Erkennung

Ohne externe Dienste: `npm ci`, `npm run build`, `npm start`. Offline nur im Produktionsbetrieb. Für Entwicklung `npm run dev`; zuvor registrierten Produktions-Service-Worker vor Entwicklung am selben Ursprung abmelden, aber keine persönlichen Browserdaten löschen.

## Empfohlen: persönliches ChatGPT-Abo

Auf ausdrücklichen Nutzerwunsch: `npm ci`, `npm run build`, `npm run abo:start`, dann http://127.0.0.1:3125/. Kein API-Schlüssel nötig. Eigene offizielle Anmeldung und Abo-Freigabe; separate freiwillige Übertragungsfreigabe, danach Foto auswählen und fertiges Rezept bestätigen. [Anleitung und Grenzen](CHATGPT-ABO.md).

## Alternativer expliziter API-Modus

1. Eigenen API-Zugang, geeignetes Bildmodell mit Responses/Structured Outputs und Anbieterbudget bereitstellen. Dieser alternative Modus rechnet über einen ausdrücklich eingerichteten API-Schlüssel ab; er ist kein Abo-Fallback.
2. `apps/web/.env.example` nach `apps/web/.env.local` kopieren. `LOCAL_ANALYSIS_ENABLED=true`, `OPENAI_API_KEY`, `OPENAI_MODEL` und absoluten `RECIPE_DATA_DIR` setzen. Ordner privat halten; Beispielposition `private/analysis` ist in Git ausgeschlossen. Keine Browser-/NEXT_PUBLIC-Schlüssel.
3. Webserver neu starten und im zweiten Terminal `npm run worker`. Einzeldurchlauf: `npm run worker -- --once`. Beide lesen dieselbe Konfiguration. Ohne tatsächlich laufenden Worker wartet der gespeicherte Auftrag.
4. Eine Datei mit genau einem vollständigen Rezept wählen; Übertragung an OpenAI und Seitenzugehörigkeit ausdrücklich bestätigen. JPEG/PNG/WebP bis 20 Millionen Pixel, keine Animation; PDF unverschlüsselt mit 1–10 Seiten; bis 25 MB. HEIC vorerst außerhalb der App als JPEG exportieren.
5. Gesicherter Upload überlebt Browserschließen. Letzter Auftrag erscheint auf demselben Ursprung/Profil wieder; geheimer Zugriffscode bleibt im privaten Browserbestand, serverseitig nur sein Hash.
6. Den automatisch ausgefüllten Rezeptentwurf mit dem Original vergleichen; nur Lesefragen klären oder bei Bedarf Korrekturen öffnen. Fehlendes offen lassen; unleserliches nicht als angeblich fehlend behandeln. Erst danach bestätigen.
7. Server prüft Pflichtfelder, Lesefragen und Zustand. Unveränderliche bestätigte Fassung wird mit hashgeprüftem Original lokal eingefügt. Bei fehlgeschlagenem Browserspeichern die Prüfung erneut öffnen; bestätigte Fassung wird idempotent geliefert. Danach Sammlung sichern.

KI liefert Abschrift, Lesefragen und automatische Rezeptgliederung mit Feldherkunft. Manuelles Abschreiben wurde aus der Oberfläche entfernt. Keine Qualitätsbehauptung ohne echte Quellenprüfung. Bilder gehen als getrennte Kopien ohne EXIF an den Anbieter; PDFs vollständig. `store:false` ist keine Zusage generell ausgeschlossener Anbieteraufbewahrung. Keine Rezeptinhalte in gewöhnlichen Logs.

## Abbruch, Limits und Sicherung

- Standard fünf atomar reservierte Anbieteraufrufe je UTC-Tag; `ANALYSIS_DAILY_CALL_LIMIT` konfigurierbar zwischen 1 und 100. Kein Euro-Monatsbudget. Höchstens drei offene und 100 gespeicherte Aufträge.
- Anbieter-Timeout 180 Sekunden. Keine automatische Wiederholung möglicherweise berechneter Anfragen. Verwaiste Verarbeitung nach fünf Minuten beim nächsten Worker-Durchlauf sichtbar fehlgeschlagen. Abbruch verhindert späte Freigabe, garantiert aber keinen kostenlosen Anbieterabbruch.
- SQLite-Jobs/Originale separat sichern. Für Dateisicherung Web-/Workerprozesse stoppen oder SQLite-Backupfunktion nutzen; Datenbankdatei während aktiver WAL-Schreibvorgänge allein zu kopieren genügt nicht. Sammlungsexport enthält nur lokal gespeicherte bestätigte Rezepte, keine wartenden Jobs.
- Sammlungsarchive sind unverschlüsselte private Dateien. Unabhängig privat aufbewahren. Git sichert nur Quellcode. Lokale Serverdaten, Originale und Schlüssel niemals committen.

## Mehrere Geräte und Veröffentlichung

Aktuell nur bewusste Übertragung einer Sicherungsdatei, keine automatische Synchronisierung. Der lokale Analysepfad hat keine Cloud-Anmeldung/RLS und darf nicht per Tunnel/Proxy veröffentlicht werden.

Nächster Schritt: Eigentümerkonto, private Datenbank/Dateien, RLS und Konfliktschutz gemäß ARCHITEKTUR.md implementieren und mit zwei Konten prüfen. Lokale Exporte zuerst in leerer Testumgebung importieren, Hashes/Beziehungen nachweisen. Danach Analyseserver-Hosting und Kostenrahmen einrichten, unabhängige Rücksicherung und echte iPhone-/iPad-Abnahme durchführen. Die browserlokale [GitHub-Pages-Version](GITHUB-PAGES.md) ist bereits veröffentlicht; der lokale SQLite-/KI-Serverpfad bleibt davon getrennt.
