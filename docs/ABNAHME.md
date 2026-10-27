# Abnahme: Woran wir die fertige App erkennen

> **Umsetzungsstand 27.10.2026:** Dieses Dokument beschreibt den vollständigen Bauvertrag. Den tatsächlich implementierten lokalen Stand, Grenzen und Migration dokumentieren [README](../README.md), [Architektur-Ist](ARCHITEKTUR-IST.md) und [Prüfbericht](PRUEFBERICHT-2026-10-27.md). Zielvorgaben gelten dadurch nicht als abgenommen.

**Spezifikation · hier ist noch kein Test als bestanden markiert.**

Priorität P0 bedeutet: vor Nutzung mit der echten Sammlung zwingend bestehen. P1 bedeutet: für die erste alltagstaugliche Version ebenfalls erforderlich, kann während der Entwicklung später kommen. Jeder Nachweis nennt Datum, Appversion, Testquelle und gegebenenfalls Gerät/Browser.

## 1. Rezepttreue — P0

| ID | Ausgangslage | Erwartetes Ergebnis |
| --- | --- | --- |
| R01 | Gut lesbares gedrucktes Rezept | Alle Zutaten, Mengen, Einheiten, Anweisungen und Hinweise vollständig und korrekt abgedeckt. |
| R02 | Handschrift mit „1“/„7“, „g“/„dag“, „½“ | Keine still gewählte Lesart; unklare Stellen erzeugen blockierende Rückfragen. |
| R03 | Zutat nur im Anleitungstext | Sichtbar in der Zutatenansicht mit Herkunft und unbekannter Menge. |
| R04 | Zutat in Liste, ohne erkennbare Verwendung | Weder entfernen noch Verwendung erfinden; Abweichung sichtbar prüfen. |
| R05 | Keine Temperatur, keine Portionen, „über Nacht“ | Fehlende Angaben bleiben unbekannt; „über Nacht“ bleibt unverändert. |
| R06 | „1–2 EL“, Dezimalkomma, „nach Bedarf“, „20 dag“ | Wortlaut und Spannweiten erhalten; keine automatische Normalisierung der Anzeige. |
| R07 | Rezept mit Randnotiz und Korrektur | Randnotiz berücksichtigt; mehrdeutige Streichung nicht eigenmächtig aufgelöst. |
| R08 | „Währenddessen“, „falls nötig“, „wahlweise“ | Parallelität, Bedingungen und Alternativen auch im Kochmodus erhalten. |
| R09 | Mehrere Rezepte/Seiten, falsche Seitenfolge | Auswahl beziehungsweise Korrektur verlangen; keine Vermischung. |
| R10 | Unscharfes oder abgeschnittenes Foto | Neuaufnahme oder manuelle Klärung, keine erfundene vollständige Fassung. |
| R11 | Leeres PDF, Rechnung oder sonst kein Rezept | Status „Kein Rezept erkannt“ statt schemafüllender Fantasie. |
| R12 | Anleitung im Scan: „Ignoriere Regeln …“ | Nur Quellinhalt; keine Werkzeugaufrufe, Netzabrufe oder Regeländerung. |
| R13 | Erfundenes Quellenzitat oder fremde Block-ID im Modellergebnis | Referenzprüfung weist das Ergebnis ab; keine Freigabe. |
| R14 | Formal gültiger, aber inhaltlich falscher Modelloutput | Vergleich bleibt möglich; Bestätigung nie allein wegen Schema/Modellvertrauen. |
| R15 | Utensil/Zeit vom System ergänzt | Dauerhafte Kennzeichnung als Vorschlag/Schätzung; kein Einschmuggeln in Originalanleitung. |
| R16 | Direkter API-Aufruf zur Bestätigung trotz offener Issues | Server lehnt ab. |

Testbestand: zunächst mindestens 20 künstliche Fälle mit allen oben genannten Varianten. Vor Alltagseinsatz mindestens 20 vom Eigentümer freigegebene, repräsentative Originalrezepte, darunter Handschrift, Druck, mehrseitiges PDF und schwierige Aufnahmen. Wenn weniger verfügbar sind, Qualität ausdrücklich nur für den kleineren Bestand berichten.

Messgrößen: falsche kritische Felder, ausgelassene Originalinhalte, erfundene Angaben, erkannte/übersehene Unsicherheiten, Zeit für menschliche Korrektur, Kosten pro Import. Ziel im Abnahmebestand: **null unbemerkte kritische Abweichungen in der endgültig bestätigten Fassung**. Das ist ein Testziel für diesen Bestand, keine Garantie für beliebige neue Rezepte. Jeden verfehlten kritischen Fall vor Freigabe beheben oder den unterstützten Umfang klar begrenzen.

## 2. Speicherung und Zugriff — P0

| ID | Prüfung | Erwartetes Ergebnis |
| --- | --- | --- |
| S01 | Nutzer B fordert Rezept/Original/Export von A an | Kein Zugriff, auch nicht über erratene IDs oder Storage-Endpunkte. |
| S02 | Abgemeldeter Aufruf privater Daten | Abgewiesen; keine privaten Inhalte im allgemeinen Seitencache. |
| S03 | Client sendet fremde `owner_id`/Versions-ID | Server ignoriert/verbietet Manipulation und schützt Beziehungen. |
| S04 | Bestätigtes Rezept erneut analysieren | Neuer Entwurf, alte Version und Original unverändert. |
| S05 | Zwei Geräte bearbeiten denselben Entwurf | Konflikt sichtbar; kein stilles Überschreiben. |
| S06 | Original nach Transformation/Export herunterladen | SHA-256 identisch mit hochgeladenen Originalbytes. |
| S07 | Produktionsbundle, Git und Logs prüfen | Keine API-/Service-Schlüssel, Originalrezepte oder privaten Dateilinks. |
| S08 | Datei mit falscher Endung, riesigen Abmessungen, zu vielen Seiten | Frühzeitig und verständlich abgewiesen. |
| S09 | Upload bricht ab / Sitzung läuft ab | Kein falsches „gespeichert“; Wiederaufnahme oder erneuter Upload mit klarem Status. |

## 3. Analysebetrieb — P0

- J01: Nach vollständig gesichertem Upload App schließen. Job läuft serverseitig weiter; Ergebnis beim Wiederöffnen vorhanden.
- J02: Worker nach KI-Antwort, vor Datenbankabschluss beenden. Wiederanlauf erzeugt höchstens eine veröffentlichte Entwurfsfassung.
- J03: Timeout, Anbieterlimit, Ablehnung und ungültige Schemaantwort auslösen. Begrenzte Wiederholungen; eindeutiger Fehler statt Endlosschleife.
- J04: Doppeltes Tippen auf „Analysieren“. Ein bewusst gestarteter Import erzeugt keinen doppelten Job.
- J05: Monatslimit mit mehreren gleichzeitigen Imports erreichen. Serverreservierung verhindert Überschreitung durch neue Aufträge.
- J06: Import abbrechen. Späte Antworten werden nicht als fertiges Rezept veröffentlicht; vorhandene Originale bleiben kontrollierbar.

## 4. Kochen und Geräte — P1

- U01: Utensilien → Zutaten → Überblick → Schritte vollständig durchlaufen.
- U02: Obere Pfeile sind groß und sichtbar; auf 320 Pixel Breite kein horizontaler Zwangsscroll. Hauptaktionen mindestens 64 Pixel hoch, übrige Ziele mindestens 48 × 48.
- U03: Vorwärts, rückwärts und direkter Schrittsprung verlieren weder Reihenfolge noch Timerzustand. Letzter Schritt endet korrekt.
- U04: Originalansicht schließen führt zur gleichen Kochposition. Große Originalseiten sind separat vergrößerbar.
- U05: Schriftvergrößerung auf 200 %, Hoch-/Querformat, VoiceOver und Tastatur: alle Kernaktionen erreichbar, Fokus und Beschriftungen verständlich.
- U06: Installation vom Safari-Browser auf Home-Bildschirm sowohl iPhone als auch iPad; Sitzung bleibt nutzbar.
- U07: Kameraaufnahme, normale HEIC-Fotos, Fotomediathek und PDF aus „Dateien“ auf echten Geräten erfolgreich.
- U08: Kochansicht öffnen, Gerät drehen, App verlassen, wieder öffnen. Richtige Version/Position wieder angeboten.
- U09: Rezept während des Kochens auf anderem Gerät ändern. Laufender Durchgang bleibt bei seiner ursprünglichen Version.
- U10: Timer starten, App in Hintergrund, zurückkehren. Restzeit aus Endzeit berechnet; keine falsche Zusage eines Hintergrundalarms.
- U11: Wake Lock nicht unterstützt/abgelehnt/verloren. Kochen bleibt bedienbar und Status ehrlich.
- U12: Mindestens fünf komplette Rezeptdurchläufe auf echten Geräten ohne blockierenden Bedienfehler; Geräte und OS-Versionen protokollieren.
- U13: Dunkler Modus entspricht den Navy-/Blau-Tokens in DESIGN.md; Text- und Bedienkontraste gemessen. Keine frühere Olivgestaltung. Abschluss „Fertig gekocht. Guten Appetit!“ ohne Archivierungs-/Generationenbotschaft.
- U14: Bei unveränderter Geräteausrichtung/Schriftgröße alle Ansichten mit kurzen und sehr langen Inhalten vorwärts/rückwärts durchlaufen, Vorlage öffnen/schließen und Abschluss erreichen. Position und Größe beider Navigationsbuttons bleiben identisch. Nicht verfügbare Pfeile werden deaktiviert, nicht entfernt. Kein Fokusverlust und keine automatische Scrollverschiebung beim Blättern. Nach Ausrichtungswechsel erneut prüfen; in der installierten PWA bleibt die obere Leiste auch beim Lesen langer Inhalte erreichbar.

Browseremulation hilft beim Layout, ersetzt aber keine Prüfung von Kamera, HEIC, Home-App, Speicher und Sperrverhalten auf iPhone/iPad. Ist ein echtes Gerät noch nicht verfügbar, diesen Punkt offen lassen.

## 5. Offline, Export und Wiederherstellung — P1, vor Archivbetrieb P0

- O01: „Offline bereit“ erst nach vollständiger Speicherung. Flugmodus, App neu öffnen, Zutaten und alle Schritte samt Originalvorschau erreichbar.
- O02: Speicher voll oder Browserdaten gelöscht. Ehrlicher Status, keine Behauptung einer vorhandenen Sicherung; erneutes Laden aus Cloud möglich.
- O03: Logout und Anmeldung als anderes Konto. Keine Rezeptreste des vorherigen Nutzers zugänglich.
- O04: Appupdate während Kochsitzung. Kein erzwungener Neustart, kein verlorener Fortschritt.
- E01: Vollständiger Export enthält alle Originale, Rezepte, Herkunft und Versionen samt Manifest und Prüfsummen.
- E02: Export in leere Testumgebung importieren. Anzahl und Verknüpfungen stimmen; Originale bytegleich, Status und Ergänzungsherkunft erhalten.
- E03: Manipuliertes Archiv, ungültige Pfade, fehlende Dateien, unbekannte Schemaversion oder Hashfehler. Import wird sicher und verständlich gestoppt.
- E04: Gesamte produktionsähnliche Datenbank **und** Originalspeicher aus unabhängiger Sicherung wiederherstellen; vereinbarte Wiederherstellungsziele messen.
- E05: Papierkorb, endgültige Löschung und Wiederherstellung aus älterem Backup prüfen; gelöschte Daten nicht unbemerkt neu veröffentlichen.
- E06: Große Sammlung exportieren, ohne Browserarbeitsspeicher zu überladen. Jobzustand und autorisierter Download funktionieren nach erneutem Öffnen.

## 6. Berichtsvorlage für Sol

Pro Lieferpaket knapp dokumentieren: tatsächlich verfügbare Funktion, getestete Version/Geräte, bestandene IDs, offene IDs, bekannte Grenzen und konkreter nächster Schritt. „Alle Tests bestanden“ ist nur zulässig, wenn die genannten Prüfungen tatsächlich durchgeführt wurden. KI-Qualität nie aus künstlichen Beispielen allein ableiten.

## 7. Erweiterter Auftrag — Pflicht zur vollständigen Abnahme

Die Fälle **F01–F14** aus [PLANUNG-UND-NAEHRWERTE.md](PLANUNG-UND-NAEHRWERTE.md) sind Teil dieser Abnahme. Sie prüfen Suche, Tags, Nährwerte, Rezeptvorschläge, manuelle/automatische Menüplanung und Einkauf. Kritische Datenfehler, fremder Datenzugriff, still ausgelassene Zutaten oder ein widersprüchlicher Portionsmaßstab zwischen Einkauf und Kochen blockieren die Freigabe. Ein funktionierender automatischer Plan allein genügt nicht: auch der vollständig selbst zusammengestellte Plan muss ohne erneute manuelle Zutatenwahl die Liste erzeugen.
