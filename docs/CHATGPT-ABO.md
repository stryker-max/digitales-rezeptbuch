# Foto-Erkennung mit dem ChatGPT-Abo

Stand 27. Oktober 2026. Auf ausdrücklichen Nutzerwunsch ohne API-Schlüssel eingerichtet und mit künstlichen PNG-/PDF-Rezepten tatsächlich getestet. Persönlicher lokaler Windows-Betrieb; keine Zusage für eine öffentlich gehostete Abo-App.

## Start und Bedienung

Node.js 24+, Windows. Im Projektordner:

```powershell
npm ci
npm run build
npm run abo:start
```

Öffnen: **http://127.0.0.1:3125/**. Für Entwicklung alternativ `npm run abo`. Beide starten Webserver und separaten Analyseworker. Rechner und Dienst müssen für Anmeldung und Erkennung laufen. Bestätigte Rezepte kochen nach geprüftem Offlinepaket ohne KI. Port, Adresse und Browserprofil beibehalten; bestehende Sammlungen vor Ursprungswechsel exportieren und auf der Zieladresse importieren.

1. „Rezept hinzufügen“ öffnen. Bei Bedarf „Continue with ChatGPT“ und die offizielle Anmeldung selbst abschließen; Abo-Nutzung dort freigeben. Die App verwendet eigene Anmeldedaten, keine Codex-Sitzung.
2. Einmal freiwillig **„Automatisch erkennen: Von mir ausgewählte Rezeptfotos/PDFs an OpenAI senden …“** einschalten. Diese eigene, jederzeit widerrufbare Auswahl ist zunächst aus. Sie gilt für ausgewählte Dateien mit jeweils einem vollständigen Rezept; keine Sammlung wird automatisch übertragen. Die Abo-Anmeldung allein erteilt diese Freigabe nicht. Ohne Dauerfreigabe die Übertragung je Datei ausdrücklich bestätigen und starten.
3. Foto aufnehmen oder Datei wählen. Nach dem Upload übernimmt die KI Titel, Portionen, Zutaten, ausdrücklich genannte Utensilien, Schritte und Originalhinweise automatisch. Fertiger Entwurf öffnet sich von selbst. Keine manuelle Abschrift und kein Zuordnen nötig.
4. Ergebnis mit der unveränderten Vorlage vergleichen, eventuelle Lesefragen klären und **„Geprüft speichern“** drücken. Korrekturfelder sind eingeklappt. Die KI bestätigt niemals selbst. Danach „Sammlung sichern“ für eine unabhängige Sicherung verwenden.

JPEG/PNG/WebP bis 20 Millionen Pixel; PDF unverschlüsselt, 1–10 Seiten eines Rezepts, bis 25 MB. HEIC/HEIF noch nicht unterstützt: bei Bedarf als JPEG exportieren. Keine echte iPhone-/iPad-Kameraabnahme. Bei unleserlicher Vorlage schärfer neu aufnehmen; kein stiller Demo-Fallback. Ältere reine Abschriftsentwürfe lassen sich durch erneute Auswahl des Originals neu erkennen; bereits gespeicherte Rezepte bleiben unverändert.

## Zugang und Schutz

Offizielles Sign-in with ChatGPT DevKit unter `packages/chatgpt-local`, mit mitgelieferter Lizenz, Drittanbieterhinweisen und dokumentierten lokalen Änderungen. Eigene App-Registrierung, explizite Abo-Freigabe, tatsächlicher Modellkatalog des Kontos. Erste verfügbare Modellauswahl bzw. gespeicherte Auswahl; Bild-/PDF-Fähigkeit erforderlich. Im tatsächlichen Test `gpt-6.1-sol`. Nutzungsgrenzen bleiben die des Kontos. Zusätzlich lokales Standardlimit **20 Aufrufe je UTC-Tag**, über `ANALYSIS_DAILY_CALL_LIMIT` zwischen 1 und 100 einstellbar. Kein automatischer Wechsel auf eine kostenpflichtige API.

OAuth-Anmeldedaten liegen Windows-DPAPI-verschlüsselt für den aktuellen Windows-Nutzer unter `private/chatgpt-abo`; keine Schlüssel/Token im Browser, Git oder Sammlungsexport. Der Browser hält nur den geheimen Zugriffscode seines lokalen Analyseauftrags. Im Job wird die ChatGPT-Profilkennung festgehalten; ein späterer Kontowechsel darf den Auftrag nicht über ein anderes Konto verarbeiten. API- und Abo-Jobs sind getrennt.

Private Originale/Aufträge liegen unter `private/analysis-abo/analysis.sqlite`. Datenbank mit WAL, separater Worker, atomare Reservierung, höchstens drei offene/100 gespeicherte Jobs. Auftrag läuft nach Upload auch ohne Browser weiter, solange Rechner/Dienst laufen. Bei Fehlern keine automatische Wiederholung; bewusster Neustart kann erneut Abo-Nutzung verbrauchen. Ein laufender Anbieteraufruf kann trotz Abbruch fertig laufen, wird danach aber nicht mehr freigegeben.

Bilder werden als getrennte orientierte Arbeitskopien ohne EXIF gesendet; PDFs nach Prüfung vollständig. Originalbytes bleiben erhalten. Öffentliche Responses-Schnittstelle mit OAuth statt API-Schlüssel, `store:false` und Streaming; keine privaten ChatGPT-Web-Endpunkte. `store:false` ist keine pauschale Zusicherung über Anbieteraufbewahrung.

## Herkunft und Grenzen

Prompt `recipe-import-2026-10-27.2`: blockweise Abschrift plus vollständige Rezeptgliederung. Jedes Feld referenziert Quellblöcke; übernommene Texte/Mengen werden gegen diese geprüft. Jeder Block muss zugeordnet oder sichtbar begründet ausgeschlossen sein. Lesefragen verhindern die Freigabe bis zur Nutzerklärung. Original, ungeprüfte Abschrift, Modell, Promptversion, automatische Gliederung und Prüfentscheidungen bleiben nachvollziehbar und gehen in den Sammlungsexport ein. Formale Herkunftsprüfung kann weder falsche Abschriften noch ausgelassene Wörter innerhalb eines verwendeten Blocks sicher erkennen. Sie ersetzt den Originalvergleich nicht.

Die öffentliche GitHub-Pages-App enthält keinen Analyseserver. Dort ist automatische Foto-Erkennung deaktiviert; gesicherte Sammlungen lassen sich importieren und offline verwenden. Lokalen Dienst nicht per Tunnel oder Proxy veröffentlichen. Cloudkonto, RLS, automatische Gerätesynchronisierung und dauerhaft gehostete Abo-Anbindung sind nicht umgesetzt. Der aktuelle offizielle Preview-Zugang für lokale persönliche Apps stellt keine allgemeine Freigabe für ferngehostete Web-Apps dar.

Tatsächlich geprüft: Abo-Anmeldung, echter Modellkatalog, Textaufruf, je ein künstliches PNG/PDF zunächst als Abschrift und danach je ein PNG/PDF als vollständig gegliedertes Rezept. Titel, 2 Portionen, 1 Stück Apfel, 10 g Butter und beide Schritte erhalten; Originale bytegleich. Der echte PNG-Entwurf wurde im isolierten Browser ohne Eingabe von Rezepttext bestätigt und gespeichert. Keine persönlichen Rezepte übertragen; Handschriftqualität, große Quellenvielfalt und echte Geräte bleiben offen.

Offizielle Dokumentation, am 27.10.2026 geöffnet: [Anmeldung](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [Modelle und Inferenz](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [Preview-Grenzen](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations). Quellstand und lokale Änderungen: `packages/chatgpt-local/UPSTREAM.md`.
