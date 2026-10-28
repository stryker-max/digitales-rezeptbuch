# Private Online-Version: GitHub Pages und Neon Free

**Stand 28.10.2026.** Backend und verschlüsselte Abo-Verbindung sind auf Neon Free eingerichtet. Echte PNG-/PDF-Erkennung mit künstlichen Rezeptquellen bestanden; beide Originale kamen bytegleich zurück. Die GitHub-Webseite verwendet diese private API. Die einmalige Passwort-Festlegung durch den Eigentümer ist noch nötig. Echte iPhone-/iPad-Kamera-/PWA-Abnahme steht aus.

## Kosten und Ablauf

Es wurde ausschließlich der kostenlose Neon-Tarif verwendet. Kein Render-Dienst, keine Kartendaten, kein Datenträger-Abo, kein kostenpflichtiger API-Zugang und kein automatisches Upgrade. Render wurde wegen der Kartenabfrage aufgegeben. Die KI nutzt ausschließlich die ausdrücklich freigegebene eigene Rezeptbuch-Abo-Verbindung; kein Neon AI Gateway. Bei Abo-/Hostinglimits stoppt die Verarbeitung. Die vorhandenen kostenlosen Kontingente können sich ändern und sind keine Verfügbarkeitsgarantie.

Aktuelle Neon-Free-Grenzen: 1 GB Datenbank, 100 CU-Stunden, 5 GB ausgehender Datenverkehr je Projekt/Monat; Functions 10 aktive und 400 wartende Capacity-Stunden sowie 1 Million Aufrufe je Projekt/Monat. App-Grenzen zusätzlich: 100 gespeicherte Aufträge, drei gleichzeitig, insgesamt 200 MB Originale, maximal 25 MB je Datei, PDF mit 1–10 Seiten eines vollständigen Rezepts und 20 Analyseaufrufe je UTC-Tag. Kein Bereinigen privater Daten zur Umgehung der Grenzen. Regelmäßig unabhängig sichern.

Auf jedem Gerät die [App](https://stryker-max.github.io/digitales-rezeptbuch/) öffnen und mit dem eigenen Passwort anmelden. Für die erste Passwort-Festlegung erhält nur der Eigentümer einen privaten Einrichtungslink; das erste erfolgreiche Absenden sperrt die Ersteinrichtung dauerhaft. Mindestens 20 Zeichen, sicher aufbewahren. Die Anmeldung gilt auf dem jeweiligen Gerät 30 Tage; „Dieses Gerät abmelden“ entfernt die lokale Sitzung. Keine selbstbedienbare Passwort-Wiederherstellung oder zentrale Liste zur Fernabmeldung aller Geräte implementiert.

Danach: „Rezept hinzufügen“, freiwillig die dauerhafte Übertragungsfreigabe einschalten, ein vollständiges Rezept fotografieren bzw. ein PDF auswählen. Ohne dauerhafte Freigabe wird nur die ausdrücklich bestätigte einzelne Datei übertragen. Die Erkennung füllt das Rezept aus. Original vergleichen, offene Lesefragen klären, „Geprüft speichern“. Keine automatische Freigabe ungeprüfter Rezepttexte und keine manuelle Abschrift. Kochen benötigt keine KI. JPEG/PNG/WebP und PDF; HEIC/HEIF ist noch offen.

## Laufende Komponenten

- Statischer Client: GitHub Pages, Repository `stryker-max/digitales-rezeptbuch`, Branch `main`. Öffentliche API-Adresse in `apps/pages/remote-api.json`, keine Geheimnisse im Browser-Build. `RECIPE_PAGES_API_BASE` kann einen Testdienst wählen; ein leerer Wert erzeugt weiterhin die reine Offline-Webversion.
- Backend: `recipeapi` und `recipeworker` als getrennte Neon Functions, Node 24, Frankfurt. Runtime und Persistenz hängen nicht am eingeschalteten Windows-Rechner. Die separate `recipecheck`-Funktion liegt nur im künstlichen Testzweig.
- Dauerhafte PostgreSQL-Datenbank: Originalbytes, Jobs, bestätigte Versionen, Passwort-Hash und verschlüsselte Abo-Profile. Additive Migrationen 1/2; keine Änderung bestehender lokaler Archive.
- Die API speichert erst dauerhaft und benachrichtigt dann den Worker. Ein authentifizierter Neon Function Trigger prüft alle 15 Minuten liegengebliebene Jobs, auch nach geschlossenem Browser. Bearbeitung atomar unter einer globalen Sperre; maximal drei Aufträge je Aufruf. Nach unklarem Abbruch keine automatische erneute Anbieterübertragung. Wiederanlauf kann bis zum nächsten 15-Minuten-Takt dauern.
- Regelmäßige Wartung erneuert nur die vorhandene Abo-Erlaubnis, ohne Inferenz oder Modellabfrage. Refresh-Zwischenstände werden vor nachfolgender Prüfung dauerhaft verschlüsselt bestätigt. Widerrufene Erlaubnis wird nicht umgangen; dann ist eine neue ausdrückliche Freigabe über den gesicherten Einrichtungsweg nötig.
- Bildaufbereitung mit offizieller sharp-WASM-Variante. Festes Versions-/SHA-512-Manifest; öffentliche npm-Dateien werden beim ersten Bildzugriff geprüft geladen, ohne Installationsskripte oder npm-Prozess. Dadurch bleiben Deploy-Pakete klein. Erstes Foto kann länger dauern. Die Prüfung bewahrt Originalbytes, richtet die Arbeitskopie aus und entfernt EXIF.

Die Testzweig-Aufgabenplanung ist nach dem Nachweis ausgeschaltet, um das kostenlose Kontingent nicht dauerhaft mit Tests zu belegen. Die produktive Wiederanlaufplanung bleibt eingeschaltet. Anonyme Aufrufe werden vor Rezept-/Abo-Zugriff abgewiesen; das schützt Daten, ist aber kein vorgeschalteter DDoS-Filter. Native Funktionsaufrufe verbrauchen trotzdem Hostingkontingent.

## Geheimnisse, Übergabe und Wiederherstellung

Die eigenen Sitzung-, Profil- und Worker-Schlüssel sind getrennte zufällige 256-Bit-Werte. Sie werden ausschließlich als authentifiziert verschlüsseltes Runtime-Paket übertragen, bei Neon im Funktionsumfeld gehalten und dort mit einem zweckgebunden aus der injizierten eigenen Rollenverbindung abgeleiteten Schlüssel geöffnet. Abo-Profile liegen separat AES-256-GCM-verschlüsselt in PostgreSQL. Einmalige Einrichtungsfreigabe nur als Hash im Serverpaket; der zufällige Link bleibt beim Eigentümer. Das Browser-Token ist eine persönliche signierte Sitzung, kein SQL-/Abo-/Server-Schlüssel.

Private lokale Wiederherstellungskopie: `private/neon-server-config.dpapi`, Windows CurrentUser-verschlüsselt. Sie enthält die Einrichtungsschlüssel; nicht committen, ausgeben oder unverschlüsselt versenden. Bei Änderung des Neon-Rollenkennworts muss das Runtime-Paket aus dieser gesicherten Kopie bewusst neu verschlüsselt und auf beiden Funktionen ersetzt werden. Falscher Schlüssel oder beschädigte Profile stoppen den Zugang; sie erzeugen keinen leeren Ersatz. Server-Gesamtsicherung und ein vollständig geführter Wiederherstellungsdialog sind noch offen.

`prepare-neon-runtime.mjs` bereitet die geschützte eigene Einrichtung vor und gibt nur das verschlüsselte Paket aus. `import-neon-abo.mjs` übernimmt nach Freigabe ausschließlich die ausgewählte Rezeptbuch-Verbindung, prüft die unveränderte Originaldatei und bewahrt vorhandene Serverprofile. Keine Codex-Anmeldedaten. Nach dem Umzug nur die Serverkopie dieser Sitzung erneuern; der alte lokale Worker ist gestoppt. Die ursprüngliche DPAPI-Datei bleibt erhalten, enthält nach Serverrotation aber keine eigenständig weiterverwendbare Sitzung mehr.

## Privatheit, Abgleich und Offline

Ein einzelner privater Eigentümer, keine öffentliche Rezeptsammlung und kein Familien-/Mehrbenutzersystem. HMAC-Sitzungen, scrypt-Passwort-Hash, begrenzte Anmeldung, CORS-Allowlist, Eingabe-/Dateiprüfung und zusätzliche Analyse-Bearercodes. SQL-Zugänge nur im Server, keine Service-Schlüssel im Browser. Die vollständige RLS-Mehrbenutzerarchitektur aus dem Bauplan ist noch nicht umgesetzt.

Neue bestätigte KI-Rezepte werden auf weiteren angemeldeten Geräten ergänzt, jeweils nach Archiv-/Inhalts-/Originalhashprüfung. ID-Konflikte blockieren Überschreiben. Alte lokale/wiederhergestellte Rezepte werden nicht still hochgeladen. Plan, Einkauf und persönliche Metadaten bleiben gerätelokal. Diese Daten sind im vollständigen lokalen Export enthalten. Die bestehende Offlinekopie bleibt auch nach lokaler Abmeldung erhalten; Abmelden löscht keine Rezepte.

„Sammlung sichern“ weiterhin regelmäßig unabhängig aufbewahren. JSON-Sicherungen sind privat und unverschlüsselt. Wartende Aufträge und Abo-Schlüssel sind kein Teil des Sammlungsexports. Ein exportiertes Original muss seiner gespeicherten Prüfsumme entsprechen; Rücksicherung prüft sie erneut. Browser können lokale Daten löschen; ein Serverkonto ist kein Ersatz für unabhängige Sicherungen.

## Tatsächliche Prüfung

- 30 Bibliothekstests, drei Gateway-/Verschlüsselungstests, SDK 59 bestanden / eine Windows-Prüfung übersprungen.
- Web-, Pages-, Functions- und Worker-Typprüfungen; Next-Produktionsbuild, Funktionspakete und Pages-Build bestanden. Acht bisherige Produktions-Browserabläufe und der statische Pages-Ablauf bestanden.
- Vollständiger Functions-Router mit isoliertem PostgreSQL und explizit simuliertem Anbieter: doppelte Einreichung, genau eine Verarbeitung bei Konkurrenz, serverseitige unveränderliche Bestätigung, privater Geräteabruf und Archiv mit bytegleichem Original. Keine echten Anbieteraufrufe in diesem synthetischen Integrationstest.
- Tatsächliches Neon-Hosting: Passwort-Ersteinrichtung mit künstlichem Zugang, falsches Passwort abgewiesen, anonyme/fremde/gefälschte Anfragen abgewiesen, CORS, WASM-Bilddekodierung und separater Worker geprüft. Gefälschte Trigger-Header werden vom Neon-Eingang entfernt. Tatsächlicher Zeitplanstart im Serverprotokoll nachgewiesen.
- 390-Pixel-Testbrowser: Anmeldung am echten Neon-Testdienst, privater Rezept-/Originalabgleich, Kamera-Eingabe, keine automatische Übertragungsfreigabe und keine Browserfehler. Dies ist kein echtes iPhone.
- Zwei echte Abo-Durchläufe direkt vom produktiven Neon-Server: künstliches PNG und künstliches PDF, Modell `gpt-6.1-sol`. Je zwei Zutaten / zwei Schritte, keine offenen Lesefragen, beide Originale bytegleich. Die Entwürfe wurden nicht als echte Rezepte automatisch freigegeben. Kein API-Bezahlzugang.

Noch erforderlich: persönliche Passwort-Festlegung, echte Kamera-/PWA-/Offline-Abnahme auf iPhone und iPad, Last-/Kontingentbeobachtung, Wiederherstellung kompletter Serverbestände und gemeinsame Plan-/Einkaufsdaten.

Quellen: [Neon Free und Functions](https://neon.com/docs/introduction/plans#functions), [Functions-Laufzeit](https://neon.com/docs/compute/functions/reference/runtime-limits), [Trigger](https://neon.com/docs/compute/functions/triggers/overview), [OpenAI: selbst gehostete Anwendungen](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms), [Abo-Aufrufe](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference), [sharp WASM](https://sharp.pixelplumbing.com/install/#webassembly).
