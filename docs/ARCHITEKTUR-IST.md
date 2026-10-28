# Implementierte Architektur und Migration

Stand 27. Oktober 2026, Weiterbau ab `1988cd5`. Der vollständige Cloud-Bauvertrag bleibt gültig. Die lokale Umsetzung ersetzt dessen Zugriffs-, Qualitäts- und Geräteabnahme nicht.

## Bestand bewahren

Die bestehende App speicherte Original-Blobs und eigene Rezepte in IndexedDB `digitales-rezeptbuch-local-v1`, Store `recipes`, Version 1. Name, Store und Version bleiben gleich; bestehende Datensätze werden weder geändert noch gelöscht. Neue Fassungen werden nur eingefügt. Keine Operation überschreibt bestätigten Inhalt. Vollständige Versionsbearbeitung fehlt noch.

`digitales-rezeptbuch-preferences-v1` bleibt der localStorage-Schlüssel. Neue Felder bekommen beim Lesen alter Daten leere Standardwerte. kg-/dag-/l-Kaufmengen werden in zugehörige Basiseinheiten überführt. Originalmengen bleiben unverändert. Ohne bekannte Portionszahl verwendet der Plan ausdrücklich Rezeptmengen; derselbe Faktor gilt bei Einkauf und Kochzutaten.

Sicherung v2 erweitert v1 um Einstellungen und optionale Analyseherkunft. Alle Einträge und Original-Hashes werden vor dem Einfügen geprüft; Einfügen neuer Rezepte erfolgt in einer IndexedDB-Transaktion. ID-Konflikte auch bei abweichenden Zutaten/Schritten werden abgewiesen. Einstellungen ersetzt der Nutzer in einem sichtbaren zweiten Schritt. Das ist keine atomare Gerätesynchronisierung. Bereits vorhandene persönliche Browserprofile wurden nicht geöffnet oder bereinigt; Tests laufen mit isolierten Profilen und synthetischen Daten.

## Offline

Nach dem Next-Build erzeugt `scripts/build-offline.mjs` einen Service Worker mit Build-ID und Liste aller JS-/CSS-/Fontdateien, Manifest, Symbolen und Beispieldarstellung. Installation lädt das komplette Paket; Installationsfehler verwerfen das neue Cachepaket. Alte Pakete werden erst bei Aktivierung entfernt. Aktive alte Clients verhindern reguläre sofortige Aktivierung. Bewusste Updateaktion ist beim Kochen deaktiviert.

Nur bekannte App-Dateien und Navigation auf `/` werden bedient; keine API-, RSC- oder persönlichen Daten im gemeinsamen Shellcache. Originale bleiben in IndexedDB. Prüfung liest alle App-Dateien und Originale samt Hash und fordert optional beständigen Speicher an; sie verspricht keine unabhängige Sicherung. Im lokalen Zwischenstand steht der gesamte Browserbestand offline bereit; gezielte Cloudpakete mit Kontentrennung kommen später. Ein Cloudkonto/Logout mit Offline-Kontentrennung gibt es noch nicht. Die davon getrennte lokale ChatGPT-Abo-Verbindung kann verbunden und getrennt werden.

## Lokaler Analysepfad

Webserver und eigenständiger Node-Worker teilen eine private SQLite-Datei mit WAL und Transaktionen. Zustände: `queued → processing → needs_review → confirmed`, außerdem `failed`/`cancelled`. Größe/Signatur, Bildformat/-fläche und PDF-Seitenzahl werden geprüft; beschädigte/verschlüsselte PDFs abgewiesen. Originalbytes bleiben erhalten. Bildarbeitskopien werden mit Sharp orientiert, verkleinert und von EXIF befreit. PDF geht nach pdf-lib-Prüfung vollständig an den Anbieter; eingebettete Inhalte werden lokal nicht ausgeführt.

Loopback-/Ursprungsschutz und zufälliger Zugriffscode je Auftrag; serverseitig nur dessen Hash. Einzelinstanz für lokale Entwicklung, kein Mehrnutzersystem und kein RLS-Ersatz. Server per Skript an `127.0.0.1` gebunden; keine Veröffentlichung per Tunnel/Proxy.

Ein Worker reserviert Auftrag und Tagesaufruf atomar mit `BEGIN IMMEDIATE`; höchstens drei offene und 100 gespeicherte Jobs. Pro Auftrag ein Anbieteraufruf, Timeout 180 Sekunden. Verwaiste Verarbeitung wird nach fünf Minuten beim nächsten Worker-Durchlauf als Fehler markiert. Keine automatische Wiederholung unklar berechneter Anfragen. Abbruch verhindert spätere Ergebnisveröffentlichung. Tagesaufruflimit ist kein Monatskostenbudget. Für Cloud bleibt PostgreSQL/Worker mit Eigentümerprüfung, Budgetreservierung und Leases der Zielweg.

Responses-API mit `store:false`, ohne Werkzeuge/URL-Nachladen, versioniertem Prompt und gemeinsamem Schema für vollständige blockweise Abschrift, Seiten und Lesefragen. Das gemeinsame Schema ergänzt eine automatisch ausgefüllte Rezeptgliederung samt Herkunft je Feld. Übernommene Texte/Mengen werden auf wörtliche Belege geprüft; jeder Block muss zugeordnet oder begründet ausgeschlossen sein. Keine Vollständigkeitsgarantie innerhalb eines verwendeten Blocks. Der frühere manuelle Übertragungsweg wurde auf ausdrücklichen Nutzerwunsch entfernt; Korrekturen sind optional eingeklappt. Ungeprüfte Abschrift, Modell-/Promptversion und Entscheidungen bleiben separat erhalten. Server prüft Pflichtfelder, Zustand und jede Lesefrage vor Freigabe; bestätigte Fassung wird unveränderlich gespeichert. Formale Prüfungen beweisen weder Handschriftrichtigkeit noch Vollständigkeit der Nutzerbearbeitung.

## Metadaten

Automatische Tags: versionierte Titel-/Zutatenregeln mit Belegen, persönliche Overrides getrennt vom Rezept. Keine automatisch behaupteten Ernährungs-/Allergenmerkmale. Automatische Regeln haben noch keine eigene historische Revisionsablage; aktuelle Regelversion und Belege sind sichtbar, persönliche Overrides gesichert.

Nährwerte: bewusst gewählte Lebensmittel/Zustände aus importiertem Katalog mit Quelle, Version, Lizenz. Automatische Rechnung für g/kg/dag, separate Vollständigkeit je Nährstoff; pro Portion nur bei vollständigem Nährstoff und bekannter Portionszahl. Keine pauschalen Dichte-/Stückfaktoren, Garverlustrechnung oder erfundenen Werte. Echter Katalog und automatische sichere Zuordnung fehlen noch.

## Dokumentationsquellen

Am 27. Oktober 2026 geöffnet: [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [OpenAI File Inputs](https://developers.openai.com/api/docs/guides/file-inputs), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Keine Modellqualitätsbewertung daraus abgeleitet.

## Entscheidung: persönliches ChatGPT-Abo statt API-Schlüssel

Am 27.10.2026 ausdrücklich vom Nutzer gewählt. [Abo-Betrieb](CHATGPT-ABO.md): eigenes offizielles OAuth-Profil, Windows-DPAPI, Kontomodellkatalog, eigener Worker. Anbieterjobs speichern `auth_kind`, `profile_id` und `prompt_version`. SQLite ergänzt diese Spalten verlustfrei; bestehende Jobs bleiben API-Jobs mit alter Promptversion, bestehende Originale unverändert. Nur Aufträge des passenden Providers/Kontos verarbeiten. Kein API-Fallback. Eigene Übertragungsfreigabe für ausgewählte Rezeptdateien zunächst aus; nur tatsächliche Nutzerwahl schaltet automatischen Start ein. Nutzerbestätigung bleibt serverseitig erforderlich. Bestehende manuelle Rezepte/Archive bleiben lesbar, neue Originalnotizen und strukturierte Herkunft werden additiv gesichert. IndexedDB-Version bleibt unverändert.

Lokaler Produktionsstarter `npm run abo:start` hält Port und private Verzeichnisse des Entwicklungsstarters bei. Öffentliche Pages bleiben statisch und ohne Abo-Server. Diese Entscheidung ist keine produktive Cloudmigration und erlaubt keine Veröffentlichung privater Zugangsdaten oder Rezeptoriginale.

## Private Online-Version · 28.10.2026

Aktueller Betrieb: GitHub Pages als Client, zwei Neon Functions (`recipeapi`, `recipeworker`) und Neon PostgreSQL im kostenlosen Konto. Render wurde wegen verlangter Kartendaten nicht eingerichtet. Next.js bleibt für lokale Entwicklung und den bereits getesteten alternativen privaten Gateway-Pfad erhalten; es wird nicht als flüchtiger Neon-Job ausgeführt.

Die API authentifiziert den einzelnen Eigentümer über eine HMAC-signierte, auf den App-Ursprung beschränkte 30-Tage-Sitzung. Das Browser-Token ist eine persönliche Sitzung; kein SQL-, Abo- oder Server-Schlüssel landet im Client. Die Erstkonfiguration braucht eine separate zufällige Einmalfreigabe und ein vom Eigentümer festgelegtes Passwort; scrypt-Hash mit eigenem Salt in der Datenbank, atomare einmalige Einrichtung. Begrenzte Anmeldeversuche, Größenlimits, CORS-Allowlist und zusätzliche Analyse-Bearercodes. Die vorhandenen internen Routen erhalten erst nach erfolgreicher Prüfung das prozessinterne Eigentümertoken. Gefälschte externe Inhaber-/Weiterleitungsheader werden verworfen.

Jobs, unveränderte Originale, bestätigte Fassungen und verschlüsselte Abo-Profile bleiben dauerhaft in PostgreSQL. Additive Migrationen 1/2/3 stehen unter einer Datenbanksperre. Originale liegen als BYTEA vor; Statusabfragen laden diese nicht mit. Queue/Tageslimits und unveränderliche Bestätigung sind atomar. Ein globaler Worker-Session-Lock verhindert konkurrierende Verarbeitung; ein separater Profil-Lock schützt rotierende Refresh-Tokens. Refresh-Checkpoints werden sofort bestätigt und überleben folgende Identitätsprüfungsfehler. Direkte TLS-geprüfte Verbindungen, kein Transaktionspooler.

Die API benachrichtigt nach dauerhaftem Upload den getrennten Worker über einen nur serverseitig verfügbaren Schlüssel. Zusätzlich startet ein verifizierter Neon Function Trigger alle 15 Minuten den Worker; offene Browserfenster sind kein Job-System. Die Queue ist maßgeblich, `waitUntil` nur die schnelle Benachrichtigung. Der Worker verarbeitet höchstens drei Aufträge je Aufruf. Unklar unterbrochene Anbieteraufrufe werden nach fünf Minuten als fehlgeschlagen markiert und nie automatisch erneut gesendet. Wartung erneuert ausschließlich die bestehende Abo-Erlaubnis über den geprüften OAuth-Pfad, ohne Modellabfrage oder Inferenz; ein Widerruf erfordert erneute ausdrückliche Anmeldung.

Die Runtime-Einstellungen werden als AES-256-GCM-Paket bereitgestellt und erst auf Neon mit einem aus der dort injizierten eigenen Rollenverbindung abgeleiteten, zweckgebundenen Schlüssel geöffnet. Die darin enthaltenen Sitzung-/Abo-/Worker-Schlüssel sind getrennte zufällige 256-Bit-Werte. Verschlüsselte Abo-Profile liegen separat in Postgres; eine DPAPI-geschützte lokale Wiederherstellungskopie bleibt privat. Bei Änderung des Datenbankkennworts muss das Runtime-Paket bewusst neu verpackt werden. Kein stilles Zurücksetzen bei Schlüsselverlust.

Die Bildverarbeitung verwendet sharp 0.35.5 mit dem offiziellen WASM-Paket. Ein Versions-/SHA-512-Manifest bindet öffentliche npm-Archive fest; beim ersten Bildzugriff lädt die Funktion diese ohne npm-Prozess oder Installationsskripte, prüft die Integrität und entpackt nur begrenzte reguläre Dateien. Originale bleiben unverändert. Dadurch bleiben die Funktionspakete unter einem MB und benötigen keine nativen ausführbaren Dateizuordnungen. PDF-Prüfung bleibt JavaScript. Hardware-/Kameraabnahme auf iPhone und iPad steht noch aus; HEIC/HEIF noch nicht unterstützt.

Die vorhandenen SQLite-Dateien, DPAPI-Originalprofile und das Browser-Exportformat bleiben erhalten. Der alte lokale Abo-Worker ist gestoppt; nach Tokenrotation nur die neue Serverkopie weiterverwenden. Automatischer Geräteabgleich ergänzt ausschließlich bestätigte KI-Rezepte mit geprüftem Original; keine stille Übertragung alter lokaler Bestände und keine Plan-/Einkaufs-Synchronisierung. Eine private Einzelinhaberinstanz ist kein Mehrbenutzersystem; die vollständige RLS-Zielarchitektur bleibt offen. [Betrieb und Prüfstand](ONLINE-BETRIEB.md).

## Anmeldung per Passkey oder kurzem Code · 28.10.2026

Auf ausdrücklichen Nutzerwunsch keine Mindestlänge und keine Zeichenregeln für den persönlichen Online-Code; sechs Ziffern sind zulässig. Nichtleere Eingabe und technische 200-Zeichen-Grenze, scrypt und bestehende Hashes bleiben erhalten. Übergreifende Limits 5/Minute, 20/Stunde, 100/Tag mit eigener PostgreSQL-Tabelle; getrennt vom Passkey-Budget. Migration 3 ist additiv und verändert weder Owner-Passwort noch Rezepte, Abo-Profil, Sitzungsschlüssel oder lokale Daten.

Passkeys über fest gepinnte SimpleWebAuthn-Pakete. Erst nach gültiger Eigentümersitzung registrierbar, festes RP-ID/Origin-Paar des Pages-Hosts, Geräteverifikation und Anwesenheit erforderlich. Öffentliche Schlüssel und Signaturzähler in PostgreSQL, private Schlüssel/Biometrie bleiben beim Gerät. Registrierung an dieselbe Sitzung gebunden; einmalige serverseitige Challenges laufen nach fünf Minuten ab und werden atomar vor Prüfung verbraucht. Signaturprüfung, Zählervergleich und ursprünglicher Host verhindern Wiederholung und Hostwechsel. Keine automatische Passkey-Erstellung; bestehender Code bleibt Alternative. Bis zu zehn Passkeys, noch keine zentrale Widerrufsoberfläche. Die Browserfunktion wählt Face ID/Touch ID/Geräteentsperrung, die App kann Face ID nicht erzwingen.

Prüfung: Chrome mit virtuellem Plattform-Authenticator und isoliertem Neon-Testbereich, 390 Pixel, kryptografische Registrierung und Anmeldung, sechsstelliger Code, Wiederholung/falsche Challenge/fehlende Geräteverifikation abgewiesen, Abbruch und getrennte Limits bestanden. Echte Face-ID-Prüfung am iPhone bleibt offen. [Serverbibliothek](https://simplewebauthn.dev/docs/packages/server), [Browserbibliothek](https://simplewebauthn.dev/docs/packages/browser).
