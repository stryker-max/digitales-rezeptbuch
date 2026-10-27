# Privates Rezeptbuch auf iPhone und iPad

**Stand 27.10.2026:** Kostenloser Serverpfad implementiert und geprüft; Render-Start noch ausstehend. Keine behauptete Geräteabnahme. Nutzerentscheidung: ausschließlich kostenlose Tarife, kein kostenpflichtiger API-Zugang.

## Betrieb

- GitHub `stryker-max/digitales-rezeptbuch`, Branch `main`, Node 24.18.0, Frankfurt.
- **Render Free**, 0 USD/Monat, ohne Datenträger. Build `npm ci && npm run build`, Start `npm run start:private`, Health `/_health`.
- **Neon Free** im eigenen kostenlosen Workspace, PostgreSQL in Frankfurt. Eigene Datenbank `rezeptbuch`; separater Zweig `synthetic-storage-verification` enthält ausschließlich künstliche Prüfquellen.
- Webserver und separater Abo-Worker auf Render; Neon hält Originale, Rezepte, persistente Aufträge und verschlüsselte Abo-Verbindung. Lokale PC-Dateien sind nicht erforderlich. Keine automatischen Upgrades, kein API-Fallback.
- Render schläft nach 15 Minuten ohne eingehenden Verkehr. Erstes Öffnen kann etwa eine Minute dauern. Bei längerer Verarbeitung/Neustart kann ein Auftrag unterbrochen werden. Persistente Aufträge gehen dadurch nicht verloren; unklar begonnene Anbieteraufrufe werden bewusst nicht automatisch wiederholt. Keine Garantie für einen ständig aktiven Hintergrundworker im Free-Tarif.
- Neon Free kann ebenfalls einschlafen. Der Worker vermeidet dauerhaftes Zwei-Sekunden-Polling und erhält bei Upload eine Prozessnachricht; Wartungsprüfung alle sechs Minuten. Verbindungen werden nach zehn Sekunden Leerlauf freigegeben.
- Free-Kontingente gelten: derzeit Neon 1 GB/Projekt, 100 CU-Stunden und 5 GB ausgehender Datenverkehr/Monat; Render 750 kostenlose Instanzstunden/Workspace/Monat sowie Build-/Bandbreitenkontingente. Kein Bezahltarif eingerichtet. Bei Kontingentende kann die App ausfallen, bis das Kontingent erneuert wird. Kein kostenloser Dienst ersetzt unabhängige Sicherungen.
- Zusätzliche App-Grenzen: 100 gespeicherte Aufträge, drei gleichzeitig, insgesamt 200 MB Originale in der Serverdatenbank, 25 MB je Datei und maximal zehn PDF-Seiten. Maximal 20 reservierte Abo-Aufrufe pro UTC-Tag (einstellbar 1–100), keine automatische Wiederholung. Fotoübertragung erfordert weiterhin eine ausdrückliche Dateifreigabe oder die freiwillige dauerhafte Übertragungsfreigabe.

## Geschützte Runtime-Einstellungen

Werte nie in Git, Browser-App oder Protokolle kopieren:

| Name | Zweck |
| --- | --- |
| `RECIPE_DATABASE_URL` | Direkte PostgreSQL-Adresse ohne `-pooler`, Rolle und Passwort; TLS-Zertifikate werden geprüft |
| `RECIPE_OWNER_PASSWORD` | Persönlicher Zugang, 20–200 Zeichen, vom Eigentümer eingegeben |
| `RECIPE_SESSION_KEY` | Zufälliger 256-Bit-Schlüssel für signierte Sitzungen |
| `RECIPE_CREDENTIAL_KEY` | Anderer zufälliger 256-Bit-Schlüssel für AES-256-GCM; getrennt vom Datenbankbestand aufbewahren |
| `RECIPE_CHATGPT_BOOTSTRAP` | Einmaliges verschlüsseltes Paket des freigegebenen App-Profils; nach erfolgreichem Import aus Render entfernen |
| `RECIPE_PUBLIC_ORIGIN` | Optional feste HTTPS-Adresse; sonst `RENDER_EXTERNAL_URL` |
| `ANALYSIS_DAILY_CALL_LIMIT` | Standard 20 |

`RECIPE_PRIVATE_DATA_DIR` ist mit Neon nicht erforderlich. Ohne Datenbank ist der ältere Dateipfad weiterhin möglich, benötigt aber einen echten dauerhaften Datenträger; er wird nicht für Render Free verwendet. Der Starter erzwingt Abo-Modus, interne Loopback-Adressen und ein zufälliges internes Zugangstoken. API-Schlüssel werden aus Kindprozessen entfernt.

Die Postgres-Tabellen werden additiv mit nachverfolgter Migration eingerichtet. Schema und Originalspeicher wurden zuerst im getrennten Testzweig geprüft. Kein Supabase-/Mehrbenutzersystem: eine private Instanz für den Eigentümer, komplette Oberfläche durch Passwort und Ursprungskontrollen geschützt. Datenbankkennwort ausschließlich serverseitig; keine öffentliche SQL-/Originalschnittstelle.

## Abo-Umzug und Schutz

Nur die bereits freigegebene Rezeptbuch-Verbindung verwenden, keine Codex-Anmeldung. `create-server-bootstrap.mjs` liest den neuen Schlüssel über stdin und gibt nur verschlüsselten Inhalt aus. Der erste Import erzeugt eine eigene stabile Host-ID. Bestehende Serverprofile haben Vorrang; falscher Schlüssel oder beschädigter Inhalt führen zum Fehler, nicht zum Zurücksetzen. Originales Windows-DPAPI-Profil bleibt unverändert. Der alte lokale Worker wurde gestoppt: nur der neue Server darf diese Sitzung erneuern.

Abo-Zugänge liegen AES-256-GCM-verschlüsselt in Neon, Schlüssel getrennt bei Render. Der Refresh-Zwischenstand wird sofort dauerhaft gespeichert, auch wenn die nachfolgende Prüfung fehlschlägt. Direkte Verbindungen und eine exklusive Session-Sperre verhindern konkurrierenden Refresh in Web und Worker. Bei widerrufener Verbindung ist erneute geschützte Einrichtung nötig; der iPhone-Browser wird nicht auf einen falschen localhost-Callback geschickt.

Zugangscookie: Secure, HttpOnly, SameSite=Lax, Hostbindung, 30 Tage. Gateway prüft Anmeldung/Origin, entfernt fremde Inhaber-/Weiterleitungsheader und spricht ausschließlich mit dem internen Next-Server. Dieser prüft zusätzlich das interne Token. Analyseaufträge behalten ihre separaten Bearercodes. `/_health` enthält keine Rezept-/Kontodaten.

## Sammlung und Sicherung

Neue bestätigte KI-Rezepte werden beim Öffnen und bei Rückkehr auf das jeweilige Gerät ergänzt. Archive und Original-Prüfsummen werden vor Übernahme validiert. Gleiche ID mit verändertem Inhalt blockiert den Abgleich; keine bestätigte Fassung wird überschrieben. Die Browserkopie erlaubt weiterhin Offline-Kochen. Alte lokale oder aus Datei wiederhergestellte Rezepte werden nicht still hochgeladen. Plan, Einkauf und persönliche Metadaten bleiben gerätelokal.

„Sammlung sichern“ weiterhin regelmäßig auf jedem relevanten Gerät verwenden. Die JSON-Sicherung ist privat und unverschlüsselt; unabhängig aufbewahren. Wartende/fehlgeschlagene Serveraufträge und Abo-Anmeldungen gehören nicht in diesen Rezept-Export. Ein automatischer Server-Gesamtexport samt Wiederherstellung ist noch offen. Keine Fernlöschung bereits gespeicherter Offlinekopien.

## Prüfstand

30 Bibliothekstests, zwei Gateway-/Bootstrap-Tests sowie vollständige Produktions-HTTP-Prüfung mit synthetischer Anmeldung, Auftrag, Bestätigung, Gerätearchiv und bytegleichem Original bestanden. Abo-SDK: 58 bestanden, eine Windows-bedingte Prüfung übersprungen. Typprüfungen und Produktionsbuilds bestanden. Bisherige Browserprüfungen: acht Produktionsabläufe und ein Pages-Ablauf.

Zusätzlich tatsächlicher Neon-Testzweig: atomare doppelte Einreichung, konkurrierende Worker-Übernahme, Auftragsberechtigung, unveränderliche Bestätigung, Archiv-Rücksicherung mit gleichem Original, verschlüsselte Profile, stabiler Host, abgewiesener falscher Schlüssel und trotz folgendem Fehler dauerhaft gespeicherter Refresh-Zwischenstand. Keine OpenAI-Aufrufe und keine echten Rezepte in diesem Test.

Noch offen: Render-Veröffentlichung, tatsächlicher Abo-Aufruf vom neuen Server, Neustart-/Kaltstartprüfung im Hosting, anonyme Zugriffsprüfung der öffentlichen Adresse und echte Kamera-/PWA-/Offline-Abnahme auf iPhone/iPad. Der frühere echte lokale Bild-/PDF-Abo-Test ersetzt diese Online-Abnahme nicht. HEIC/HEIF ist noch nicht unterstützt.

Quellen: [Render Free](https://render.com/docs/free), [Neon Free](https://neon.com/docs/introduction/plans), [Neon: 1 GB Free](https://neon.com/blog/neon-free-plan-1-gb-per-project), [Neon Pooling](https://neon.com/docs/connect/connection-pooling), [PostgreSQL-TLS](https://node-postgres.com/features/ssl), [OpenAI: persönliche selbst gehostete Anwendungen](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms). Anbieter können ihre kostenlosen Kontingente ändern.
