# Digitales Rezeptbuch

**Rezeptbuch für iPhone/iPad in Entwicklung · 30. Oktober 2026 · Weiterbau ab `1988cd5`**

Next.js-/React-App für eigene Foto-/PDF-Rezepte, Originalvergleich, Kochen, Wochenplan und Einkauf. Navy-/Blau-Oberfläche mit großen Schaltflächen und festen Kochpfeilen. Lokal sowie mit privater Neon-API benutzbar. Ein privater Haushalt mit zwei eigenen Konten und gemeinsamem Plan/Einkauf ist implementiert. Echte Geräteabnahme, Mail-Wiederherstellung und ein allgemeines Mehrhaushaltssystem bleiben offen.

## Private iPhone-/iPad-Version mit KI

**[App auf iPhone/iPad öffnen](https://stryker-max.github.io/digitales-rezeptbuch/)**. Kompakter Login mit E-Mail und Passwort sowie optional Face ID/Passkey. Keine Mindestlänge oder Zeichenregeln; sechs Ziffern sind möglich. Zwei eigene Konten für einen gemeinsamen Haushalt: Der Inhaber legt sein Konto einmal über den privaten Einrichtungslink an und lädt die Partnerin unter **Mein Konto → Partner einladen** ein. Die Partnerin wählt über ihren persönlichen Einladungslink selbst Name, E-Mail und Passwort. Bestätigte Rezepte, Wochenplan, gekaufte Mengen und eigene Einkaufsposten werden gemeinsam genutzt. Bisherige Codezugänge bleiben bis zur einmaligen Kontovervollständigung benutzbar. Der eigene Rechner muss nicht laufen. Echte Foto-/PDF-Erkennung vom Neon-Free-Server mit künstlichen Vorlagen geprüft; echte iPhone-/Face-ID-Abnahme steht aus.

**Nur kostenlose Tarife, keine Kartendaten und kein kostenpflichtiger API-Fallback.** Render wurde wegen der Kartenabfrage nicht eingerichtet. Kostenlose Kontingente können den Betrieb bei Überschreitung unterbrechen; es wird nicht automatisch hochgestuft. [Online-Betrieb, Schutz und Grenzen](docs/ONLINE-BETRIEB.md).

**Mobile Überarbeitung vom 30.10.2026:** Anmeldung als eigene schmale Ansicht, Eingaben mit mindestens 16 px und korrigierte Breitenberechnung. Bei 320/360/375/390/430/768 px ohne horizontalen Überlauf geprüft. Die technischen Schaltflächen „Offline-Paket prüfen“ und „Update laden“ sind entfernt. App-Dateien werden im Hintergrund vorbereitet; neue Versionen werden beim nächsten sicheren Öffnen/Zurückkehren übernommen, ohne Kochschritte, ausgewählte Fotos oder laufende Eingaben zu unterbrechen.

Der Serverpfad ergänzt vorhandene lokale Rezepte samt unveränderten Originalen. Alte lokale Originale werden nicht still hochgeladen. Plan und Einkauf werden nach Anmeldung abgeglichen; unterschiedliche gleichzeitige Änderungen zusammengeführt, widersprüchliche Änderungen ausdrücklich zur Wahl gestellt. Lokale Änderungen bleiben über Verbindungsabbrüche und Neuladen vorgemerkt. Favoriten, Kochstand, Checklisten, Nährwertkatalog und persönliche Metadaten bleiben gerätelokal. Keine öffentliche Registrierung; Einladungen sind privat und sieben Tage gültig. Noch keine E-Mail-Verifikation oder automatische Passwort-Wiederherstellung.

## Foto erkennen und kochen

Online: privat anmelden → „Rezept hinzufügen“ → einmal freiwillig „Automatisch erkennen … an OpenAI senden“ einschalten → Foto aufnehmen → automatisch ausgefülltes Rezept vergleichen → „Geprüft speichern“. Kein Abtippen. Offene Lesefragen bleiben sichtbar und müssen geklärt werden. Die Abo-Freigabe ersetzt die Foto-Übertragungsfreigabe nicht.

### Lokale Entwicklung (optional)

http://127.0.0.1:3125/ · Die auf Neon übertragene alte Abo-Sitzung nicht parallel lokal weiterverwenden. Für lokale Anbieterentwicklung eine eigene frische Verbindung verwenden.

```powershell
npm ci
npm run build
npm run abo:start
```

Windows, Node.js 24+. Für Entwicklung `npm run abo`. Server und Analyseworker starten gemeinsam. ChatGPT-Verbindung über „Continue with ChatGPT“ freigeben. Einmal freiwillig „Automatisch erkennen … an OpenAI senden“ einschalten, dann **Foto aufnehmen → automatisch ausgefülltes Rezept ansehen → Geprüft speichern**. Kein Abtippen oder manuelles Zuordnen. Nur bei Lesefragen oder gewünschter Korrektur etwas ergänzen. Die Übertragungsfreigabe bleibt unabhängig von der Abo-Anmeldung und ist jederzeit ausschaltbar. [Ausführliche Anleitung, Grenzen und Datenschutz](docs/CHATGPT-ABO.md).

Die GitHub-Webseite speichert Offlinekopien weiter auf dem jeweiligen Gerät. Neue bestätigte KI-Rezepte samt Originalen werden nach privater Anmeldung vom Neon-Server ergänzt. Alte lokale Daten werden weder gelöscht noch still hochgeladen. Der frühere manuelle Übertragungsweg bleibt auf Nutzerwunsch entfernt. [Webversion](docs/GITHUB-PAGES.md).

**Adresse, Port und Browserprofil beibehalten.** Verschiedene Ursprünge besitzen getrennte lokale Bestände. Vor Ursprungswechsel Sammlung sichern und auf Zieladresse wiederherstellen. Browserdaten nicht löschen. Entwicklungs- und Produktionsbetrieb nicht gleichzeitig gegen denselben `.next`-Ordner ausführen. Für Offline-Nutzung die Produktionsversion einmal online öffnen; die Dateien werden im Hintergrund gespeichert.

Ohne KI-Verbindung bleiben Sammlung und Kochen benutzbar: `npm run dev` oder nach Build `npm start`, Port 3000. Eine neue Vorlage erfordert eine eingerichtete echte Erkennung; kein stiller Demo-Ersatz.

## Implementierter Stand

- Sammlung, Titel-/Zutaten-/Tag-/Abschriftsuche, Favoriten. Automatische korrigierbare Tags mit Beleg und Regelversion; keine automatisch zugesicherten Ernährungs-/Allergenmerkmale.
- Automatische Foto-/PDF-Übernahme über freigegebenes ChatGPT-Abo: Titel, Portionen, Zutaten, Utensilien, Schritte und Hinweise mit Quellblockherkunft. Fertiger Entwurf ohne Abtippen; Nutzer bestätigt das Ergebnis. Originalbytes und SHA-256 in IndexedDB sowie privater Auftragsdatenbank (Neon online, SQLite lokal). HEIC/HEIF-Erkennung noch offen.
- Große Kochansicht: Utensilien, Zutaten, Überblick, Schritte, Originalabschrift und fester Abschluss. Letzten Kochstand wieder aufnehmen. Rezept-IDs bezeichnen unveränderliche Fassungen; Bearbeitungs-/Versionsoberfläche noch offen.
- Manuelle, automatische und gemischte Wochenplanung, je ein Rezept pro Tag, automatische Einkaufsliste. Ohne bekannte Portionsbasis ausdrücklich **Rezeptmengen**. Gleicher Faktor in Planung, Einkauf und Kochzutaten; Originalzeiten/-temperaturen bleiben unverändert.
- g/kg/dag und ml/l zusammenrechnen, Brüche lesen, offene Mengen erhalten. Gekaufte Mengen bleiben bei Planänderung berücksichtigt. Freie Einkaufsposten ergänzen/abhaken. Offene Mengen bleiben „Menge prüfen“ und sind noch nicht mengenmäßig abhakbar. Verwaiste Kaufzuordnungen bleiben gespeichert, haben noch keine eigene Anzeige.
- **Sicherung v2** mit eigenen Rezepten, Originalbytes/Hash, vorhandener KI-Abschriftsherkunft, Plan/Einkauf, eigenen Positionen, Favoriten, Checklisten/Kochposition, Tagkorrekturen, Lebensmittelkatalog und Zuordnungen. Alte v1-Dateien bleiben lesbar. Abweichende Inhalte unter gleicher Rezept-ID blockieren den Import. Einstellungen erst nach ausdrücklicher Übernahme ersetzen.
- **Offline im Produktionsbetrieb:** versionsgebundene App-Dateien im Service Worker, Rezepte/Originale in IndexedDB, Einstellungen im lokalen Speicher. App-Dateien werden automatisch zwischengespeichert; Original-Prüfsummen werden bei Import, Abgleich und Export geprüft. Updates erfolgen außerhalb laufender Kochschritte und Eingaben, ohne zusätzliche technische Bedienknöpfe. Browser kann Speicher trotzdem löschen; regelmäßig unabhängig sichern.
- **Nährwertrechnung:** versionierten Lebensmittelkatalog laden und passende Datensätze je Zutat wählen, danach automatische deterministische Rechnung. Quellen/Zustand/Version/Lizenz und Rechenweg sichtbar. Fehlende Werte bleiben unvollständige Teilsummen; keine erfundenen KI-Werte oder pauschalen ml-/Stückfaktoren. Ein echter BLS-/USDA-Bestand und sichere automatische Zuordnung sind noch nicht enthalten. [Katalogformat](docs/LEBENSMITTELKATALOG.md).
- **Echter KI-Pfad:** persistente SQLite-Jobs lokal bzw. PostgreSQL-Jobs online und separater Worker, automatische Gliederung, Quellblöcke/Lesefragen und serverseitige Nutzerfreigabe. Abo-Anmeldedaten Windows-verschlüsselt lokal, keine API-Schlüssel nötig, kein bezahlter API-Fallback. Echter Bild-/PDF-Durchlauf mit künstlichen Vorlagen nachgewiesen. Bestehender expliziter API-Modus bleibt als Alternative. [Lokaler Betrieb](docs/LOKALER-BETRIEB.md).

Vier vorinstallierte Rezepte und deren KI-Bilder sind ausdrücklich künstliche Beispiele. Automatische Wochenvorschläge berücksichtigen aktuell auch diese klar markierten Beispiele. Harte Ausschlüsse, Zeitfilter und ein reiner Eigene-Rezepte-Modus sind noch offen.

## KI und Grenzen

Der persönliche Online- und Windows-Zugang nutzt das ausdrücklich freigegebene ChatGPT-Abo. Accountmodelle werden tatsächlich geladen, Abo-Nutzung in ChatGPT verwaltet. Standard lokal 20 Anbieteraufrufe je UTC-Tag im Abo-Starter, keine automatische Wiederholung nach unklaren Fehlern. JPEG/PNG/WebP bis 20 Millionen Pixel und PDF mit 1–10 Seiten eines einzelnen vollständigen Rezepts, jeweils bis 25 MB. Bilder als Arbeitskopie ohne EXIF, PDFs vollständig an OpenAI. Unveränderte Originale bleiben im privaten Serverbestand und als lokale Offlinekopie. [Abo-Anleitung](docs/CHATGPT-ABO.md).

KI bleibt fehlbar. Feldtexte und Mengen müssen in den referenzierten Blöcken vorkommen; jeder Block wird zugeordnet oder begründet ausgeschlossen. Das beweist keine vollständige oder richtige Abschrift. Offene Lesefragen blockieren „Geprüft speichern“; der Nutzer löst die Bestätigung aus. Keine frei erfundenen Nährwerte, keine zusätzlichen KI-Aufrufe beim Kochen. Keine persönlichen Rezepte für die Entwicklung übertragen; tatsächliche Anbieterprüfung mit künstlichen Foto-/PDF-Vorlagen.

Der optionale lokale Dienst bleibt ausschließlich an Loopback gebunden und darf nicht unverändert per Tunnel veröffentlicht werden. Die GitHub-Webseite ruft stattdessen die geschützte Neon-API auf; SQL- und Abo-Zugänge bleiben auf dem Server. Der alte Render-Gateway-Pfad ist als Alternative erhalten, wird hier aber nicht betrieben. Ein privater Haushalt mit zwei eigenen Konten, keine allgemeine RLS-/Mehrhaushaltsplattform. Der separate API-Schlüssel-Modus bleibt eine ausdrücklich zu konfigurierende lokale Entwicklungsalternative und wird online nie als Abo-Ersatz aktiviert.

## Sichern und Gerätewechsel

„Sammlung sichern“ lädt eine unverschlüsselte private JSON-Datei. Unabhängig aufbewahren. Auf Zielgerät über „Rezept hinzufügen → Sicherungsdatei auswählen“ importieren; neue Rezepte werden ergänzt. „Gesicherte Einstellungen übernehmen“ ersetzt dortigen Plan/Einkauf/Metadaten mit dem Sicherungsstand. Das ist bewusste Dateiübertragung. Neue bestätigte Serverrezepte und der gemeinsame Plan/Einkauf werden zusätzlich nach privater Anmeldung abgeglichen; persönliche Zusatzdaten bleiben lokal.

Maximal 100 Rezepte, 25 MB je Original und 100 MB Sicherungsdatei. Lokale Analysejobs/SQLite-Originale separat sichern; wartende Jobs sind nicht im Sammlungsexport. Bestätigte, lokal gespeicherte Analyseherkunft ist enthalten. Vor Browserbereinigung oder Gerätewechsel zuerst sichern.

## Prüfungen

```powershell
npm test
npm run test:chatgpt
npm run test:server
npm run typecheck
npm run typecheck:worker
npm run typecheck:functions
npm run build
npm run test:server:integration
npm run test:e2e
npm run typecheck:pages
npm run build:pages
npm run test:pages
```

Browsertests: isolierte Chrome-Profile, Produktionsserver auf Ports 3118/3119; Chrome muss installiert sein. Der zweite Server verwendet ausschließlich synthetische Analysekonfiguration ohne Anbieteraufruf. Echte iPhones/iPads und Home-Bildschirm-Betrieb sind separat offen. [Aktueller Online-Prüfstand](docs/ONLINE-BETRIEB.md#tatsächliche-prüfung); [früherer lokaler Prüfbericht](docs/PRUEFBERICHT-ABO-2026-10-27.md). Auf diesem Windows-System braucht der Produktionsbuild normale Dateirechte. Webpack vermeidet die hier fehlgeschlagene Turbopack-Verzeichnisverknüpfung.

## Nächste Schritte

1. Handschrift und vielfältige autorisierte Quellen prüfen, ausgelassene Teilangaben stärker erkennen, Versionsbearbeitung und geprüfte HEIC-Aufbereitung ergänzen. Automatische Gliederung und Feldherkunft sind implementiert; Qualitätsabnahme auf echten Rezepten bleibt offen.
2. Echten versionierten Lebensmittelkatalog samt Lizenz importieren, sichere automatische Zuordnung und belegte Faktoren ergänzen.
3. Persönliche Konten einrichten; E-Mail-Verifikation und Passwort-Wiederherstellung, vollständige Mehrhaushalt-/RLS-Isolation sowie unabhängige Server-Gesamtsicherung samt Wiederherstellung ergänzen. Bestehende lokale Bestände nur nach bewusstem Export und validiertem Import übertragen.
4. Echte iPhone-/iPad-Abnahme einschließlich Kamera, Offline/Updates, Speicher, VoiceOver, Timer und Wake Lock.
5. Hostingkontingente und Wiederanlauf unter realer Nutzung beobachten. Der kostenlose Neon-Analyseserver ist bereits eingerichtet und mit echten Abo-Aufrufen künstlicher Vorlagen geprüft.

Weitere offene Zielpunkte: Wochen-/Datumsverwaltung, mehrere Mahlzeitkomponenten/Chargen, Resteverteilung, Vorratszuordnung, verwaiste Käufe, Druckansicht, Papierkorb, Kochhistorie und Konflikte zwischen gleichzeitig bearbeitenden Browserfenstern.

## Vollständiger Bauvertrag

[Konzept](docs/KONZEPT.md) · [Architektur](docs/ARCHITEKTUR.md) · [Rezepttreue](docs/REZEPTTREUE.md) · [Umsetzung](docs/UMSETZUNG.md) · [Abnahme](docs/ABNAHME.md) · [Planung/Nährwerte](docs/PLANUNG-UND-NAEHRWERTE.md) · [Design](docs/DESIGN.md) · [Projektregeln](AGENTS.md).

Diese Dokumente beschreiben das vollständige Ziel. [ARCHITEKTUR-IST.md](docs/ARCHITEKTUR-IST.md) erklärt den Zwischenstand und die Migration; Zielvorgaben sind dadurch nicht automatisch abgenommen.
