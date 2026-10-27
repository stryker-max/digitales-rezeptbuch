# Digitales Rezeptbuch — eigene Rezepte, einfach gut kochen

> **Umsetzungsstand 27.10.2026:** Dieses Dokument beschreibt den vollständigen Bauvertrag. Den tatsächlich implementierten lokalen Stand, Grenzen und Migration dokumentieren [README](../README.md), [Architektur-Ist](ARCHITEKTUR-IST.md) und [Prüfbericht](PRUEFBERICHT-2026-10-27.md). Zielvorgaben gelten dadurch nicht als abgenommen.

**Produktkonzept v1.1 · 26. Oktober 2026**

## 1. Die Idee

Ein persönliches Familienrezeptbuch, das Papierrezepte bewahrt und beim Kochen begleitet. Man fotografiert einen Zettel, wählt vorhandene Fotos aus oder lädt ein PDF hoch. Die App liest das Rezept, bereitet Zutaten und Arbeitsschritte auf und zeigt Unklarheiten zur Prüfung. Danach führt eine ruhige Kochansicht mit großen Pfeilen durch das bestätigte Rezept.

**Leitsatz: Das Rezept bleibt deines. Die App macht es lesbar und benutzbar.**

Die Handschrift, Randnotizen und Erinnerungen bleiben als Original erhalten. „Von Oma Maria“, ein Anlass oder eine kleine Familiengeschichte können ergänzt werden, ohne den Rezepttext zu verändern.

## 2. Appname

**Digitales Rezeptbuch** — vom Eigentümer am 26. Oktober 2026 festgelegt. Dieser Name gilt für die Oberfläche, die spätere Installation auf dem Home-Bildschirm und alle weiteren Bauabschnitte.

Vorschlag für den Untertitel: **„Deine Rezepte. Einfach gut kochen.“**

Die Namensentscheidung ist abgeschlossen. Marken- und Domainverfügbarkeit wurden nicht geprüft.

## 3. So fühlt sich die App an

Eine elegante, ruhige Oberfläche in der dunklen Farbwelt von SmartOptimiert: tiefes Navy als Hintergrund, etwas hellere blaue Flächen, helle Schrift und klare blaue Akzente. Die ursprüngliche Papier-/Olivoptik ist ersetzt. Große Bedienelemente und klare Anweisungen bleiben im Mittelpunkt. Die konkreten Farben, Layoutregeln und kurzen Produkttexte stehen in [DESIGN.md](DESIGN.md).

Die KI arbeitet im Hintergrund. Die Hauptbereiche heißen „Rezepte“, „Wochenplan“ und „Einkauf“. Gut sichtbare Aktionen sind „Rezept hinzufügen“, „Übernahme prüfen“ und „Rezept kochen“. Keine Werbung und keine Chatoberfläche als Hauptbedienung.

Für die erste Version gilt: eine private Sammlung, ein Eigentümerkonto, Nutzung auf mehreren eigenen Geräten. Gemeinsame Familienkonten kommen später; Weitergabe als Export gehört bereits zur ersten alltagstauglichen Version.

## 4. Vom Papier in die Sammlung

### A. Rezept hinzufügen

Drei große Felder:

- **Foto aufnehmen** — öffnet die Kameraauswahl des Geräts direkt aus der App.
- **Fotos auswählen** — ein oder mehrere Bilder aus der Fotomediathek.
- **PDF auswählen** — aus „Dateien“, etwa auch aus iCloud Drive, wenn dort verfügbar.

Vor dem Start: Vorschau, Drehen, Reihenfolge festlegen und fehlende Rückseiten ergänzen. Die Originaldatei bleibt unangetastet; Verbesserung und Zuschnitt betreffen nur eine Arbeitskopie. Die erste Version soll Aufnahme und Upload zuverlässig können. Automatische Dokumentränder und Perspektivkorrektur sind eine spätere Verbesserung.

Bei mehreren Rezepten in einem PDF werden Seiten zunächst einem Rezept zugeordnet. Mehrere Rezepte auf derselben Seite werden durch ausgewählte Ausschnitte getrennt. Die App vermischt sie nicht automatisch.

### B. Rezept lesen lassen

Die App sichert die Originaldateien und startet die Analyse. Sie zeigt verständliche Zustände: „Wird hochgeladen“, „Handschrift wird gelesen“, „Rezept wird geordnet“, „Bereit zum Prüfen“. Keine erfundenen Fortschrittsprozente oder garantierten Sekundenangaben.

Nach vollständig abgeschlossenem Upload läuft die Verarbeitung auf dem Server weiter, wenn die App geschlossen wird. Beim nächsten Öffnen erscheint der gespeicherte Status. Ein unterbrochener Upload muss gegebenenfalls im Vordergrund fortgesetzt werden.

### C. Übernahme prüfen

Auf dem iPad: Original links, erkannte Fassung rechts. Auf dem iPhone: umschaltbare Ansicht mit direktem Sprung zur betroffenen Originalseite und Vergrößerung.

Geprüft werden insbesondere Mengen, Einheiten, Zutaten, Temperaturen, Zeiten, Reihenfolge und Randnotizen. Unklarheiten erhalten konkrete Fragen, zum Beispiel „Steht hier 1 oder 7 Eier?“ Falls keine sinnvolle Lesart erkennbar ist: „Diese Stelle ist unleserlich“.

Auch scheinbar eindeutige Erkennungen können falsch sein. Deshalb wird vor der ersten Freigabe das ganze Rezept gezeigt; farbige Hinweise sind nur eine Hilfe. Es gibt kein Versprechen einer fehlerfreien automatischen Handschrifterkennung. Bildmodelle können Texte falsch interpretieren; strukturierte Ausgaben beseitigen dieses Risiko nicht. [OpenAI: Bildanalyse](https://developers.openai.com/api/docs/guides/images-vision), [OpenAI: strukturierte Ausgaben](https://developers.openai.com/api/docs/guides/structured-outputs).

Unleserlicher Rezeptinhalt blockiert die Freigabe zum geführten Kochen, bis er aufgelöst wurde. Im Original tatsächlich fehlende Angaben dürfen als „nicht angegeben“ bestätigt werden. Dadurch wird etwa aus einer unbekannten Backtemperatur keine erfundene Temperatur.

Ist ein Rezept zu unvollständig zum Nachkochen, kann es trotzdem als Original mit Abschrift archiviert bleiben. Eigene Ergänzungen sind möglich, stehen aber ausdrücklich als Ergänzung mit Autor und Datum beim Rezept.

### D. In der Sammlung speichern

Gespeichert werden Original, bestätigte Abschrift, Zutaten, Reihenfolge der Arbeitsschritte und Herkunft. Die App vergibt automatisch passende Tags, etwa Fleisch, Gemüse, Suppe oder Dessert; der Nutzer kann sie korrigieren. Mehrere Tags können gleichzeitig passen. Ein vorgeschlagener Titel wird als solcher behandelt, falls das Original keinen enthält.

Korrekturen erzeugen eine neue Version. Die zuvor bestätigte Fassung bleibt nachvollziehbar und wiederherstellbar. Eine erneute KI-Analyse überschreibt niemals eine bereits geprüfte Version.

## 5. „Rezept kochen“

Die Vorbereitung folgt dieser Reihenfolge:

1. **Utensilien bereitstellen.** Große abhakbare Zeilen. Trennung zwischen „Im Rezept genannt“ und „Aus den Schritten abgeleitet“. Ein nicht genannter Topfdurchmesser wird nicht ergänzt. Vorschläge sind überprüfbar und optional.
2. **Zutaten bereitlegen.** Originalmengen und Originaleinheiten, inklusive Untergruppen wie „Teig“ und „Füllung“. Jede Zeile lässt sich abhaken. Eine Zutat, die nur im Anleitungstext vorkommt, wird mit dieser Herkunft gezeigt, ohne eine Menge zu erfinden.
3. **Überblick ansehen.** Rezeptname, Herkunft, Portionen soweit angegeben, kurze quellentreue Zusammenfassung, Anzahl der Schritte und Zeitübersicht.
4. **Loskochen.** Jeweils ein Arbeitsschritt mit großen Pfeilen oben: „← Zurück“ und „Weiter →“, dazwischen „Schritt 3 von 8“.

### Der einzelne Kochschritt

- Kurze Überschrift und darunter eine klar lesbare Anweisung.
- Für diesen Schritt benötigte Zutaten, soweit ihre Zuordnung aus dem Rezept belegbar ist.
- Temperatur und Zeit genau wie angegeben; keine stille Umrechnung von Ober-/Unterhitze auf Umluft.
- Große Schaltfläche „Originalstelle ansehen“; sie führt zurück zur gleichen Kochposition.
- Bei ausdrücklich genannter Dauer ein manuell startbarer Timer. „Goldbraun backen“ wird nicht in einen erfundenen 20-Minuten-Timer verwandelt.
- Eine nummerierte Schrittübersicht zum direkten Springen; Zurückgehen verändert keine Zutaten oder Timer.
- Nach dem letzten Schritt erscheint **„Fertig gekocht. Guten Appetit!“**, ohne automatisch wieder zum Anfang zu springen. Keine zusätzlichen Hinweise darauf, dass das Rezept erhalten bleibt.

Während eines Kochdurchlaufs bleibt die verwendete Rezeptversion fest. Eine Änderung auf einem zweiten Gerät tauscht nicht mitten im Kochen die Anleitung aus. Die letzte Kochposition wird auf diesem Gerät wieder angeboten. Beim Start aus dem Menüplan gilt dessen deutlich gekennzeichnete Portionsvariante; sie muss mit der Einkaufsliste übereinstimmen. Das Original bleibt separat einsehbar.

### Die Gesamtdauer ehrlich darstellen

„Gesamtdauer ca. 60–75 Minuten · geschätzt“ ist zulässig, wenn sie bewusst als zusätzliche Planungshilfe angezeigt wird. Sie ist keine Originalangabe. Vorhandene Originalzeiten stehen daneben unverändert. Für unzureichende Angaben lautet die Ausgabe „Gesamtdauer nicht zuverlässig abschätzbar“.

Aktive Zeit, Back-/Kochzeit und Ruhezeit werden getrennt. Überlappende Tätigkeiten werden nicht einfach addiert. Eine Schätzung darf keine neue Anweisung oder Pflichtwartezeit erzeugen. „Über Nacht“ bleibt „über Nacht“, nicht automatisch „8 Stunden“.

### Große Bedienfelder als Grundregel

Für Hauptaktionen und Pfeile sind mindestens 64 CSS-Pixel Höhe vorgesehen, für sonstige Schaltflächen mindestens 48 × 48; ungefähr 12 Pixel Abstand. Kochtext als Startwert 24 Pixel auf dem iPhone und 30 Pixel auf dem iPad, mit größerer Schrift als Einstellung und ohne gesperrtes Zoomen.

Die App funktioniert in Hoch- und Querformat. Auf dem iPad kann neben dem Schritt eine Zutatenleiste stehen; auf dem iPhone stapelt sich der Inhalt. Kein wichtiger Inhalt verschwindet hinter einer festen Leiste. Wischen darf zusätzlich funktionieren, aber nie die einzige Navigation sein. Auch Tastatur und VoiceOver müssen die Kernabläufe bedienen können.

## 6. Ohne App Store auf iPhone und iPad

Die App wird als **Progressive Web App (PWA)** gebaut und über eine gesicherte Webadresse bereitgestellt. In Safari öffnen, das Teilen-Menü aufrufen, „Zum Home-Bildschirm“ auswählen und, wenn angeboten, „Als Web-App öffnen“ aktivieren. Danach startet sie über ein eigenes Symbol. Apple beschreibt diesen Weg ausdrücklich; ein App-Store-Upload ist dafür nicht erforderlich. [Apple-Anleitung](https://support.apple.com/de-de/guide/iphone/iphea86e5236/ios).

Die Oberfläche passt sich an beide Geräte an. Updates werden über die Web-App ausgeliefert und erst nach einem laufenden Kochdurchgang aktiviert.

Offline gilt: Bereits bewusst heruntergeladene Rezepte und ihre Kochansicht funktionieren ohne Netz, solange der Gerätespeicher verfügbar ist. Die App bestätigt „Offline bereit“ erst, wenn alle benötigten Daten tatsächlich lokal vorhanden sind. Neue KI-Analysen und geräteübergreifende Änderungen brauchen Internet.

Der Browser kann lokale Daten löschen, etwa bei Speicherdruck. Daher sind Originalarchiv und Sicherungen unabhängig vom Gerät vorgesehen. [WebKit: Speicherverhalten](https://webkit.org/blog/14403/updates-to-storage-policy/).

„Bildschirm wach halten“ wird im aktiven Kochmodus angeboten, sofern vom Gerät unterstützt. Beim Sperren oder Appwechsel kann diese Funktion enden. Timer rechnen bei der Rückkehr korrekt weiter; ein Alarm bei gesperrtem Gerät wird in der ersten Version nicht garantiert. [MDN: Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API).

## 7. Bewahren und Weitergeben

Zur ersten vollständigen Version gehören:

- Originalfoto/PDF unverändert herunterladen.
- Einzelnes Rezept drucken beziehungsweise über eine Druckansicht als PDF sichern.
- Die gesamte Sammlung exportieren: Originale, lesbare Rezeptdateien, strukturierte Daten, Herkunft und Versionsverlauf.
- Einen solchen Export wieder importieren und seine Vollständigkeit prüfen.
- Automatische Sicherungen von Datenbank **und** Originaldateien; eine Wiederherstellung muss ausprobiert worden sein.
- Eine einfache Beschreibung, wie die Sammlung an Angehörige übergeben werden kann. Dafür ist kein gemeinsames Passwort nötig: Zunächst reicht ein vollständiger Export, später eigene Familienzugänge.

Offene Exportformate und regelmäßige Sicherungen erlauben einen späteren Wechsel von Gerät oder Anbieter. Diese Funktionen werden sachlich erklärt und nicht mit wiederholten Archivierungsbotschaften im Kochmodus beworben.

## 8. Umfang und Reihenfolge

| Erste alltagstaugliche Version | Spätere Erweiterung |
| --- | --- |
| Kamera, Fotos, mehrseitige PDFs | Automatische Dokumentkanten und Stapelerkennung |
| KI-Abschrift mit Prüfung und Originalvergleich | Verbesserte Erkennung anhand des eigenen Testbestands |
| Private Sammlung, Suche, automatische Tags und Favoriten | Familienrollen: ansehen, bearbeiten, verwalten |
| Utensilien, Zutaten, Übersicht, große Schrittansicht | Sprachsteuerung und Vorlesen |
| Vordergrund-Timer, lokale Kochposition | Sprachstart für Timer und weitere Komfortfunktionen |
| Nährwerte aus Zutaten berechnen, Originalangaben erkennen | Erweiterte Produkt-/Barcodezuordnung |
| Rezeptvorschläge, manuelle und automatische Wochenplanung | Erweiterte Vorratsverwaltung |
| Automatische Einkaufsliste aus jedem übernommenen Plan | Einkaufsgebinde und Preisvergleich |
| Ausgewählte Rezepte offline | Kontrollierte Synchronisierung offline bearbeiteter Rezepte |
| Versionen, kompletter Export, Sicherung, Wiederimport | Gedrucktes Familienkochbuch als gestalteter Sammelband |

Portionsumrechnung für Planung und Einkauf gehört jetzt zum Umfang. Sie erscheint als sichtbar getrennte Berechnungsvariante, auch beim Start des Kochmodus aus dem Plan. Automatische inhaltliche Rezeptvarianten bleiben eine spätere Erweiterung; Originalanweisungen werden nicht verändert.

## 9. Aufwand und laufender Betrieb

Die Benutzeroberfläche ist der einfachere Teil. Der größere Aufwand steckt in originaltreuer Übernahme, Fehlerfällen, sicherer Speicherung, iOS-Verhalten und Wiederherstellung. Deshalb wird zuerst ein vollständiger Ablauf mit wenigen Beispielen gebaut und geprüft, bevor viele Rezepte eingelesen werden.

Für die Planung sind vier Arten von Betriebskosten zu berücksichtigen: Webhosting, Datenbank/Originalspeicher, KI-Nutzung pro Import und unabhängige Sicherung; optional Domain und E-Mail-Versand für Anmeldung. Ein Chat-Abonnement wird nicht als Nachweis eines verfügbaren App-API-Budgets behandelt.

Vor Aktivierung kostenpflichtiger Dienste werden die tatsächlichen Tarife und ein Monatslimit festgehalten. Die App bekommt ein serverseitiges Importbudget. Die Kosten je Rezept werden mit einem repräsentativen Testbestand gemessen, inklusive Wiederholungen. Eine seriöse Cent-Angabe ist vor dieser Messung nicht möglich.

Für diesen Bauplan wurden noch keine kostenpflichtigen Dienste eingerichtet. Als Startannahmen gelten Deutsch/österreichische Rezeptbegriffe, eine private Sammlung und ein Eigentümerkonto. Name, tatsächliche Geräteversionen und Hostingtarif werden beim entsprechenden Bauabschnitt konkretisiert.

## 10. Suche und automatische Einordnung

Ein großes Suchfeld findet Rezepte nach Name, Zutat, Tags und eigenen Notizen. Filter wie „Suppe“, „Gemüse“, „Dessert“, „bis 30 Minuten“ oder „Favoriten“ lassen sich kombinieren. Österreichische Begriffe bleiben erhalten; Synonyme helfen beim Finden.

Automatische Tags unterscheiden Gerichtart und enthaltene Zutaten. Eine Gemüsesuppe mit Speck kann „Suppe“, „Gemüse“ und „Fleisch“ tragen. „Gemüse“ allein wird nicht mit „vegetarisch“ gleichgesetzt. Nutzerkorrekturen bleiben bestehen.

## 11. Nährwerte

Enthält die Vorlage Nährwerte, übernimmt die App sie mit ihrer Bezugsbasis. Zusätzlich können Energie, Eiweiß, Kohlenhydrate und Fett aus bestätigten Zutaten und einer Lebensmitteldatenbank berechnet werden. Diese Werte sind als Schätzung gekennzeichnet; pro Portion nur bei bekannter Portionszahl. Fehlende Mengen oder unsichere Lebensmittelzuordnungen werden sichtbar, nicht durch frei erfundene Zahlen ersetzt.

## 12. Was koche ich heute?

Die App schlägt passende eigene Rezepte vor, etwa nach verfügbarer Zeit, Wunschkategorie, Vorlieben und zuletzt gekochten Gerichten. Sie erklärt kurz den Vorschlag und sorgt auf Wunsch für Abwechslung. Nicht bestätigte oder nicht passende Rezepte werden nicht heimlich in einen fertigen Plan aufgenommen.

## 13. Wochenmenü und Einkauf

Du kannst den Plan **selbst zusammenstellen**, **vorschlagen lassen** oder beide Wege kombinieren. Je Tag Rezepte auswählen, Portionen anpassen, Gerichte fixieren oder tauschen. Suppe, Hauptgericht und Dessert dürfen eine Mahlzeit bilden. Freie Tage sind erlaubt.

Sobald du den zusammengestellten Plan übernimmst, erzeugt die App **automatisch die gesamte Einkaufsliste**. Sie summiert gleiche passende Zutaten, gruppiert sie nach Einkaufsbereich und berücksichtigt ausdrücklich markierten Vorrat. Du musst die Zutaten nicht erneut zusammensuchen. Änderungen am Plan aktualisieren die Liste; eigene Einkaufspositionen bleiben erhalten.

Bereits gekaufte Mengen bleiben beim Aktualisieren erhalten: Werden aus benötigten 500 g Karotten später 800 g, sind nach bereits gekauften 500 g nur noch 300 g offen. Unbekannte Mengen bleiben als „Menge prüfen“ sichtbar. Wenn eine Kochcharge für zwei Tage reicht, werden ihre Zutaten nur einmal gezählt.

Die genauen Berechnungs-, Datenschutz- und Abnahmeregeln stehen in [PLANUNG-UND-NAEHRWERTE.md](PLANUNG-UND-NAEHRWERTE.md). Die neuen Funktionen gehören verbindlich zum Bauauftrag für Sol.
