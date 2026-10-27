# Private Online-Version für iPhone und iPad

Stand 27. Oktober 2026: **implementiert und mit künstlichen Daten geprüft, noch nicht auf Render eingerichtet/veröffentlicht**. Der Nutzer benötigt Foto-Erkennung auf iPhone/iPad ohne eingeschalteten eigenen Rechner. Die bisherige lokale Windows-Variante ist dafür kein fertiges Ergebnis. GitHub Pages bleibt statisch und führt keine KI-Aufträge aus.

## Vorgesehener Server

Ein privater Einzelinhaber-Server auf Render, Node.js 24+, eine Instanz mit dauerhaftem Datenträger. Webserver und separater Analyseworker laufen als getrennte Prozesse derselben Instanz. Dies ist kein Mehrbenutzer-/RLS-System. Die komplette externe Oberfläche ist durch die neue Zugangssperre geschützt; intern bleibt Next.js ausschließlich auf Loopback erreichbar.

- Repository: `https://github.com/stryker-max/digitales-rezeptbuch`, Branch `main`, Root-Verzeichnis leer.
- Runtime: Node.js, `NODE_VERSION=24.18.0`, Build `npm ci && npm run build`, Start `npm run start:private`.
- Vorgesehener Compute-Tarif `0.5c-512mb` und 1 GB dauerhafter Speicher unter `/var/data`. Kleinste passende Größe; reale Lastprüfung auf Render steht noch aus. Kein automatisches Upgrade bei Speicherdruck.
- Grundkosten laut am 27.10.2026 geöffnetem Render-Dashboard und Preistabelle: **7 USD + 0,25 USD/Monat**, vor möglichen Steuern. Hobby-Workspace ohne zusätzliche Grundgebühr. Enthaltene Bandbreite/Build-Minuten beachten; Mehrverbrauch kann zusätzliche Kosten erzeugen. Ein kostenpflichtiger Tarif ist **nicht beauftragt oder gebucht**. Die automatische Freigabeprüfung hat dessen Auswahl bis zur ausdrücklichen Nutzerfreigabe blockiert.
- Region möglichst Frankfurt, sofern im gewählten Workspace verfügbar und keine zugehörigen Ressourcen eine andere Region erfordern. Health-Check `/_health`.
- Kostenloses Compute hat keinen dauerhaften Datenträger und ist für diese SQLite-/Abo-Installation ungeeignet. Kein Ausweichen auf flüchtigen Speicher oder Veröffentlichung des ungeschützten lokalen Dienstes.

## Konfiguration nach Freigabe

Geheimnisse ausschließlich als Render-Runtimewerte, nie im Repository, Browser oder Buildprotokoll speichern:

| Name | Zweck |
| --- | --- |
| `RECIPE_PRIVATE_DATA_DIR` | `/var/data` auf dem tatsächlich angehängten dauerhaften Datenträger |
| `RECIPE_OWNER_PASSWORD` | Persönlicher privater Zugang, 20–200 Zeichen; für den Inhaber sicher bereitstellen |
| `RECIPE_SESSION_KEY` | Eigener zufälliger Schlüssel, mindestens 256 Bit, Base64/Base64url; signiert die privaten Sitzungen |
| `RECIPE_CREDENTIAL_KEY` | Anderer zufälliger 256-Bit-Schlüssel, Base64/Base64url; schützt gespeicherte Abo-Zugänge mit AES-256-GCM |
| `RECIPE_CHATGPT_BOOTSTRAP` | Einmaliges verschlüsseltes Übergabepaket des ausdrücklich ausgewählten App-Profils |
| `RECIPE_PUBLIC_ORIGIN` | Optional feste HTTPS-Adresse ohne Pfad; sonst dokumentiertes `RENDER_EXTERNAL_URL` verwenden |
| `ANALYSIS_DAILY_CALL_LIMIT` | Optional 1–100, Standard 20, keine automatische Wiederholung nach Fehlern |

Der Starter setzt Abo-Modus und Datenverzeichnisse selbst; geerbte API-Schlüssel/Modellkonfiguration werden im Kindprozess geleert. Internes Zugangstoken pro Prozessstart zufällig neu. Der HTTPS-Ursprung wird strikt geprüft. Vor dem ersten Online-Aufruf müssen Tarif, Datenträger, Geheimnisse, der verschlüsselte Profilumzug und die tatsächliche Anbieterberechtigung für diesen persönlichen Server eingerichtet und geprüft sein.

## Abo-Umzug

Die offizielle OpenAI-Anleitung dokumentiert den Betrieb eigener Open-Source-Anwendungen auf selbst gehosteten VMs. Die pauschale Aussage „Abo geht ausschließlich lokal“ ist daher zu eng. Das ist keine allgemeine Freigabe für beliebige kommerzielle/öffentlich angebotene Abo-Apps; tatsächlicher persönlicher Serverzugang muss geprüft werden.

Für den Umzug nur die bereits ausdrücklich freigegebene Rezeptbuch-Verbindung verwenden, keine Codex-/fremden Anmeldedaten. `scripts/create-server-bootstrap.mjs` liest den neuen Serverschlüssel ausschließlich über stdin und liefert nur ein verschlüsseltes Paket. Es überträgt nur das ausgewählte Profil und verändert die ursprüngliche Windows-Datei nicht. Nicht ohne tatsächliche Freigabe und bekanntes Ziel ausführen. Schlüssel und Paket nicht gemeinsam protokollieren. Der Server importiert das Paket beim ersten Start unter eigener neuer Host-ID; vorhandene Serverdateien werden niemals überschrieben. Danach darf ausschließlich der Server diese Sitzung erneuern; den früheren lokalen Worker stoppen, damit nicht zwei Installationen denselben Refresh-Token gleichzeitig verwenden. Übergabevariable nach erfolgreichem Import entfernen, Schlüssel dauerhaft sicher aufbewahren.

Bei entzogener/abgelaufener Zustimmung ist erneute sichere Einrichtung nötig. Der Loopback-OAuth-Callback wird niemals fälschlich auf dem iPhone geöffnet. Keine automatische API-Abrechnung als Ersatz.

## Schutz und Geräteabgleich

- Eigenes Passwortformular, 30-Tage-Sitzungscookie mit `Secure`, `HttpOnly`, `SameSite=Lax`, Hostbindung und HMAC. Falsche Host-/Origin-Angaben und gefälschte Sitzungen abweisen; Anmeldeversuche begrenzen. Keine Rezepte/Originale für unangemeldete Anfragen. `/_health` gibt lediglich einen technischen Status ohne Daten zurück.
- Das Gateway entfernt externe Weiterleitungs-/Inhaberheader, authentifiziert zuerst, prüft schreibende Ursprünge und reicht erst dann an die interne Loopback-API weiter. Auch diese prüft im Servermodus das interne Token. Unveränderte API-Bearercodes je Analyseauftrag bleiben zusätzlich erforderlich.
- ChatGPT-Zugänge auf dem Datenträger AES-256-GCM-verschlüsselt, Schlüssel getrennt in den Runtimegeheimnissen. Falscher Schlüssel, Manipulation oder beschädigte Datei führen zum Fehler; kein Klartext- oder Leerdaten-Fallback. Bereits gespeicherte Windows-DPAPI-Zugänge bleiben unberührt.
- Bestätigte KI-Rezepte samt Originalen liegen im dauerhaften Serverbestand. Die App lädt neue bestätigte Fassungen beim Öffnen und bei Rückkehr zum Fenster auf das jeweilige Gerät. Jeder Import prüft Archivschema, Inhalt, Originalbytes und Hash. Gleiche ID mit abweichendem Inhalt blockiert den Abgleich; kein Überschreiben. Offlinekopien bleiben im jeweiligen Browser erhalten.
- Nur auf einem alten Gerät vorhandene oder manuell wiederhergestellte Rezepte werden nicht still zum Server hochgeladen. Weiterhin zunächst exportieren und bewusst wiederherstellen. Plan, Einkauf und persönliche Metadaten sind weiterhin gerätelokal; sie werden nicht automatisch zusammengeführt.
- Persönliches Passwort nur mit eigenen Geräten verwenden. Diese Ausbaustufe besitzt keine getrennten Personen-/Familienkonten und keinen Fernentzug bereits geladener Offlinekopien.

## Bisherige Prüfung und letzte Abnahme

30 Bibliothekstests bestanden, davon neue Tests für unveränderlichen Geräteabgleich, manipulierte Quellen, gefälschte/abgelaufene Host-Sitzungen und Serververschlüsselung. Zwei separate Servertests prüfen die tatsächliche HTTP-Zugangssperre und den einmaligen verschlüsselten Profilimport mit künstlichen Zugängen. Zusätzlicher vollständiger Test gegen den echten Next.js-Produktionsserver: geschützte Anmeldung, synthetischer Auftrag, serverseitige Bestätigung, privater Sammlungsabruf und bytegleiche Archiv-Rücksicherung als zweites Gerät. Dabei keine Anbieteraufrufe.

Web-/Pages-/Worker-Typprüfungen, Next.js-Produktionsbuild, Pages-Build und alle acht bisherigen Produktions-Browserabläufe bestanden; Pages-Browsertest ebenfalls bestanden. Die Testausgaben beider Suiten sind nun getrennt, damit parallele Läufe ihre Aufzeichnungen nicht gegenseitig löschen. Der vorherige echte Abo-Bild-/PDF-Test unter Windows ist kein Nachweis für den noch nicht eingerichteten Render-Server. Nach Nutzerfreigabe: echten Deploy prüfen, erneuter anonymer Zugriffstest, künstliches Foto/PDF über das Abo vom Server erkennen lassen, Originalvergleich, bestätigtes Rezept auf zweitem Gerätekontext, Neustart/Persistenz und schließlich echte iPhone-/iPad-Kamera-/PWA-Abnahme.

Quellen: [OpenAI: selbst gehostete VMs](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms), [Render: Compute-Tarife](https://render.com/docs/compute-plans), [Preise](https://render.com/pricing), [dauerhafte Datenträger](https://render.com/docs/disks), [Runtimevariablen](https://render.com/docs/environment-variables). Am 27.10.2026 geöffnet; die tatsächliche Buchungsoberfläche ist vor Ausführung erneut maßgeblich.
