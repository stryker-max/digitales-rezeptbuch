# GitHub-Webversion

**Stand 30.10.2026.** [Digitales Rezeptbuch öffnen](https://stryker-max.github.io/digitales-rezeptbuch/).

Die statische React-Webseite nutzt jetzt eine geschützte API und einen getrennten Abo-Worker auf Neon Free. GitHub selbst führt keine KI-Aufträge aus. Nach privater Anmeldung: Foto/PDF auswählen, ausdrücklich zur Übertragung freigeben und automatisch ausgefülltes Rezept prüfen und bestätigen. Eine freiwillige dauerhafte Dateifreigabe ermöglicht den Ablauf ab dem nächsten ausgewählten Foto ohne erneute Übertragungsfrage. Keine manuelle Abschrift und kein API-Bezahlzugang. Eigene E-Mail-/Passwortkonten: Inhaber einmal über den privaten Einrichtungslink, Partnerin über „Mein Konto → Partner einladen“. Danach normale Anmeldung, optional Face ID. [Betrieb und Grenzen](ONLINE-BETRIEB.md).

Neue bestätigte KI-Rezepte samt Originalen werden auf weiteren angemeldeten Geräten nach Archiv-/Hashprüfung ergänzt. Bereits vorhandene lokale Daten bleiben erhalten; sie werden nicht still hochgeladen. Plan und Einkauf werden zwischen den eigenen Haushaltskonten abgeglichen. Persönliche Metadaten, Favoriten und Kochstand bleiben gerätelokal. Vollständiger Export und bewusster Wiederimport bleiben unverändert nutzbar. Regelmäßig unabhängig sichern.

## Build und Datenschutz

`apps/pages` ist der Vite-Einstieg der gemeinsam genutzten React-Oberfläche. `npm run build:pages` erzeugt `dist/pages`, den Unterpfad `/digitales-rezeptbuch`, Manifest und versionsgebundenen Service Worker. API-Metadaten stehen in `apps/pages/remote-api.json`; diese URL ist kein Zugangsschlüssel. Keine Datenbank-, Abo- oder Server-Schlüssel in Clientdateien. Das persönliche 30-Tage-Sitzungstoken wird nur nach erfolgreicher Anmeldung auf dem eigenen Gerät gespeichert und an die fest konfigurierte private API gesendet.

`RECIPE_PAGES_API_BASE` überschreibt den Endpunkt für getrennte Tests. Ein ausdrücklich leerer Wert erzeugt weiterhin den reinen statischen Offline-Modus ohne Erkennung. `PAGES_BASE_PATH` kann den Repository-Unterpfad bewusst ändern. Der lokale Next.js-/SQLite-Pfad bleibt als Entwicklungspfad erhalten.

## Offline und iPhone/iPad

In Safari öffnen, nach Wunsch zum Home-Bildschirm hinzufügen. Mit eigener E-Mail/Passwort anmelden und bei Bedarf unter „Mein Konto“ Face ID aktivieren. App-Dateien werden im Hintergrund gespeichert, neue Versionen bei sicherem Öffnen/Zurückkehren übernommen. Keine technischen Offline-/Update-Schaltflächen nötig. Bereits gespeicherte Rezepte lassen sich offline kochen; neue KI-Erkennung braucht Internet. Kochschritte und laufende Eingaben werden nicht für Updates unterbrochen. Browser können lokale Daten trotzdem löschen.

Echte Servererkennung mit künstlichem PNG/PDF und 390-Pixel-Testbrowser sind geprüft. Eine tatsächliche Kamera-/Installation-/Offline-Abnahme auf iPhone und iPad steht noch aus; HEIC/HEIF ist noch nicht unterstützt.

## Prüfung

Produktionsbuild für den Unterpfad, isolierter Pages-Browserablauf mit Archiv-Wiederherstellung und Offline-Kochen bestanden. Zusätzlich neue mobile Browserprüfung am echten Neon-Testdienst: Anmeldung, private Rezept-/Originalsynchronisierung, Kamera-Eingabe, keine voreingestellte Foto-Übertragungsfreigabe und keine Browserfehler. [Gesamter Prüfstand](ONLINE-BETRIEB.md#tatsächliche-prüfung).
