# Suche, automatische Tags, Nährwerte und Menüplanung

> **Umsetzungsstand 27.10.2026:** Dieses Dokument beschreibt den vollständigen Bauvertrag. Den tatsächlich implementierten lokalen Stand, Grenzen und Migration dokumentieren [README](../README.md), [Architektur-Ist](ARCHITEKTUR-IST.md) und [Prüfbericht](PRUEFBERICHT-2026-10-27.md). Zielvorgaben gelten dadurch nicht als abgenommen.

**Bauvertrag v1.1 · 26. Oktober 2026 · Ergänzung zum Produktkonzept**

Diese Funktionen gehören auf ausdrücklichen Nutzerwunsch zur ersten vollständigen Version. Die App bleibt ein Rezeptbuch für eigene Rezepte. Original, Zusatzinformationen und konkrete Planung werden getrennt gespeichert.

## 1. Rezepte suchen und filtern

Ein großes Suchfeld durchsucht Titel, Zutaten, Tags, bestätigte Anleitung und selbst eingetragene Herkunft/Notizen. Treffer zeigen den Grund, beispielsweise „enthält Kürbis“. Suche nach „Topfen“ darf auch über einen hinterlegten Suchbegriff „Quark“ finden, ohne den Originaltext umzubenennen. Deutsche Umlaute, Groß-/Kleinschreibung und einfache Tippfehler berücksichtigen.

Filter: Gerichtart, enthaltene Lebensmittelgruppen, bestätigte Ernährungsmerkmale, maximale Dauer, Favoriten und zuletzt gekocht. Mehrere Werte innerhalb einer Filtergruppe gelten als ODER, verschiedene Gruppen als UND; ausgewählte Filter sichtbar anzeigen. Eine Dauergrenze trennt bekannte Zeitangaben von unbekannten und kennzeichnet geschätzte Zeiten. Entwürfe sind separat auffindbar, erscheinen aber nicht als kochfertige Vorschläge.

Technik: PostgreSQL-Volltextsuche plus kontrollierte Synonyme und bei Bedarf `pg_trgm`, jeweils unter Eigentümerzugriff. Keine externe Suchmaschine für die erste Sammlung nötig. Der Index enthält nur berechtigte Daten und wird bei Änderungen/Löschungen aktualisiert. Offline wird ausschließlich der heruntergeladene Bestand durchsucht und entsprechend bezeichnet.

## 2. Automatische Tags

Tags werden nach der bestätigten Übernahme automatisch als Zusatzmetadaten vergeben. Der Nutzer kann sie entfernen, ergänzen und dauerhaft korrigieren. Unsichere Klassifikationen bleiben als Vorschlag offen. Tags ändern keine Rezeptfassung.

| Dimension | Beispiele | Bedeutung |
| --- | --- | --- |
| Gerichtart | Suppe, Hauptgericht, Beilage, Salat, Dessert, Gebäck | Welche Art Gericht ist das? |
| Enthaltene Lebensmittel | Fleisch, Fisch, Gemüse, Hülsenfrüchte, Milchprodukte | Was ist nach den Zutaten enthalten? |
| Ernährungsmerkmal | vegetarisch, vegan | Nur bei ausreichend vollständig zugeordneten Zutaten; sonst unbekannt. |
| Zubereitung | Ofen, Pfanne, Topf, ohne Kochen | Aus belegbaren Schritten abgeleitet. |
| Anlass/Präferenz | Alltag, Wochenende, Lieblingsrezept | Vorschlag oder persönliche Zuordnung. |

Ein Rezept kann gleichzeitig „Suppe“, „Gemüse“ und „Fleisch“ tragen. Der Tag „Gemüse“ bedeutet ausdrücklich nicht vegetarisch. Gelatine, Brühe und zusammengesetzte Zutaten nicht übersehen. Automatisch gesetzte Tags sind keine Allergensicherheitsgarantie. „Glutenfrei“/„allergenfrei“ wird nicht allein aus einer groben Klassifikation zugesichert.

Speichern: kontrollierte Tag-ID, Dimension, `origin = rule | ai | user`, Belege, Status, Regel-/Modellversion. Nutzerkorrekturen und abgelehnte Vorschläge überleben erneute Analysen. Wenn sich die bestätigte Rezeptversion ändert, abgeleitete Tags neu bewerten; persönliche Entscheidungen sichtbar erhalten und mögliche Konflikte melden.

## 3. Nährwerte automatisch ermitteln

Die App zeigt Energie in kcal und kJ sowie Eiweiß, Kohlenhydrate und Fett. Ballaststoffe, Zucker und Salz sind zusätzliche Werte, wenn die Datenlage reicht. Standardanzeige ist pro Portion, sofern eine belastbare Portionsgrundlage vorhanden ist; sonst für die gesamte Rezeptmenge. „Pro 100 g fertiges Gericht“ setzt ein bekanntes Endgewicht oder einen ausdrücklich gekennzeichneten, belegten Ausbeutefaktor voraus.

Zwei getrennte Quellen:

- **Im Original angegeben:** mit ursprünglichem Bezugswert, Quelle und Prüfstatus übernehmen. Ein gedruckter Wert „pro 100 g“ darf nicht als „pro Portion“ erscheinen. Wenn Bezugsbasis/Einheit fehlen, nachfragen oder unbekannt anzeigen.
- **Aus Zutaten berechnet:** Zutaten passenden Lebensmitteldatensätzen zuordnen, Mengen nachvollziehbar umrechnen und Werte deterministisch summieren. Die Ausgabe trägt immer „geschätzt“ mit Datenquelle und Berechnungsgrundlage.

Empfohlene erste Datengrundlage: Bundeslebensmittelschlüssel (BLS), da deutschsprachige Lebensmittel und Nährstoffe enthalten sind. Der Herausgeber stellt Version 4.0 als Open Data bereit. Quellenangabe, Datenversion und Lizenzhinweise sind im Import, in der App und im Export zu erhalten. [Max Rubner-Institut: BLS](https://www.mri.bund.de/de/institute/ernaehrungsverhalten/forschungsbereiche/bundeslebensmittelschluessel-bls/), [offizieller Download und Attribution](https://blsdb.de/download).

Fallback für nicht passende Datensätze: ein geprüfter Adapter, etwa FoodData Central. Die API erlaubt Suche und Detailabruf von Lebensmitteln; Schlüssel bleiben serverseitig. Keine frei erfundenen KI-Nährwertzahlen. [USDA: API Guide](https://fdc.nal.usda.gov/api-guide/).

### Berechnungsregeln

1. Immer die bestätigte Rezeptversion verwenden. „Reis, roh“ und „Reis, gekocht“ sind unterschiedliche Datensätze. Markenprodukte, Fettstufen, Abtropfgewichte und essbarer Anteil werden berücksichtigt, sofern bekannt.
2. Für eine Zutat mit essbarer Masse `m` Gramm und Datenbankwert `n` pro 100 g gilt `Beitrag = m / 100 × n`. Pro Portion wird die Summe durch die bestätigte Portionszahl geteilt. Berechnung intern mit ausreichender Präzision; erst die Anzeige sinnvoll runden.
3. Mengen wie Stück, Tasse, EL oder ml benötigen einen passenden Umrechnungsfaktor mit Herkunft. Keine allgemeine Annahme „1 ml = 1 g“; kein ungenanntes Eiergewicht einsetzen. „Nach Bedarf“ bleibt mengenmäßig unbekannt.
4. Garverluste, aufgenommenes Bratfett, Abgießen und Wasserverlust nicht vortäuschen. Verwendete Ausbeute-/Erhaltungsfaktoren müssen zur Zutat und Zubereitung passen und dokumentiert sein. Ohne sie ist das Ergebnis eine gekennzeichnete Schätzung aus den Ausgangszutaten.
5. Nicht zugeordnete Zutat oder fehlender Nährstoffwert ist `null`, niemals null Kalorien. Teilberechnungen zeigen „unvollständig“, fehlende Zutaten und eine Teilsumme; sie dürfen nicht als vollständiger Portionswert auftreten. Auch Nährstofffelder haben einzeln einen Vollständigkeitsstatus.
6. Mehrdeutige Lebensmittelzuordnung wird korrigierbar angezeigt. Nutzer kann Produkt, essbare Menge oder Portionen als eigene Berechnungsgrundlage ergänzen. Das Originalrezept bleibt unangetastet.
7. Gedruckte und neu berechnete Werte bei Abweichung nebeneinander mit Herkunft anzeigen. Die Rechnung ersetzt den Originalwert nicht.

Ein Ausfall der Nährwertquelle verhindert weder Archivierung noch Kochen oder manuelle Planung. Status „Nährwerte derzeit nicht verfügbar“, später erneut berechnen. Rezept-, Mapping- und Datenbankversion sowie verwendete Faktoren bestimmen den Cache-Schlüssel. Ein Datenupdate verändert keine bereits gespeicherte Originalangabe.

## 4. „Was koche ich heute?“

Vorschläge stammen standardmäßig nur aus der eigenen bestätigten Sammlung. Berücksichtigt werden verfügbare Zeit, gewünschte Gerichtart, Vorlieben, ausgeschlossene Zutaten, kürzlich gekochte Rezepte und optional der eingetragene Vorrat.

Die App zeigt wenige passende Vorschläge mit konkreter Begründung: „seit längerem nicht gekocht“, „passt zu deinem Zeitlimit“ oder „verwendet die ausgewählten Kartoffeln“. „Vorrätig“ wird nur bei entsprechenden Nutzereinträgen behauptet. Fehlende Zeit- oder Vorratsangaben sind sichtbar.

Filter und Auswahl funktionieren regelbasiert. Eine KI darf natürliche Wünsche in überprüfbare Filter übersetzen und Gründe formulieren; sie darf keine Rezepte, Titel, Zutaten oder Verfügbarkeit erfinden. Zurückgegebene IDs müssen eigene bestätigte Rezeptversionen sein. Bei zu wenigen Treffern Grenzen zeigen und Änderungen anbieten, keine Ausschlüsse heimlich aufweichen.

„Abwechslungsreich“ meint eine Verteilung über verschiedene Gerichtarten, Hauptzutaten und Zubereitungen. Es ist kein automatisches Urteil „gesund“ oder „ernährungsmedizinisch ausgewogen“.

## 5. Wochenmenüplan: selbst zusammenstellen oder vorschlagen lassen

Zwei gleichwertige Einstiege verwenden denselben Plan und dieselbe Einkaufsliste:

### Selbst zusammenstellen

1. Woche beziehungsweise Zeitraum öffnen, Mahlzeiten auswählen; als einfacher Start ein Hauptgericht pro Tag. Einzelne Tage dürfen frei bleiben oder „auswärts“ sein.
2. Bei einem Tag auf **„Rezept hinzufügen“** tippen, Sammlung durchsuchen/filtern, Rezept wählen und gewünschte Portionen festlegen. Optional mehrere Komponenten wie Suppe, Hauptgericht und Dessert zu einer Mahlzeit hinzufügen.
3. Gerichte verschieben, entfernen oder austauschen. Drag-and-drop ist nur eine Ergänzung; große Schaltflächen müssen dieselben Aktionen erlauben.
4. **„Plan übernehmen“** speichert den zusammengestellten Plan und erstellt automatisch die zugehörige Einkaufsliste. Es ist keine zusätzliche manuelle Zusammenstellung der Liste nötig.

### Vorschlagen lassen

Zeitraum, Personen, Mahlzeiten, Zeitbudget je Tag, Vorlieben und gewünschte Abwechslung einstellen. Optional beispielsweise mehr Gemüsegerichte oder eine gewünschte Höchstzahl an Fleischgerichten wählen. Fixierte Tage bleiben unverändert; nur offene Plätze füllen oder einzelne Gerichte neu vorschlagen.

Die App erzeugt einen Vorschlag aus der eigenen Sammlung. Nutzer kann jedes Gericht austauschen und übernimmt anschließend den Plan. Manuell hinzugefügte und automatisch vorgeschlagene Gerichte verhalten sich danach identisch.

Harte Ausschlüsse zuerst prüfen; Abwechslung und ähnliche Einkaufszutaten sind nachrangige Ziele. Bei kleiner Sammlung ehrlich weniger Auswahl oder freie Tage anbieten. Keine tägliche Fleisch-/Fischvorgabe als angebliche Gesundheitsregel einbauen. Nicht passende „vegetarisch“-Klassifikation blockiert ein ausdrücklich vegetarisches automatisches Menü, bis sie geklärt ist.

### Portionen und Rezepttreue

Der Plan referenziert eine konkrete bestätigte Rezeptversion plus `servings` oder `batchMultiplier`. Die berechnete Planmenge ist eine deutlich bezeichnete Ansicht neben dem Original. Ausgangsportionen unbekannt: zunächst „1 Rezeptmenge“ anbieten oder Nutzer die Ausgangsportionen für diese Berechnung ergänzen lassen; keine vier Portionen annehmen.

Rechenbare Zutaten skalieren proportional. Unbestimmte Mengen bleiben offen; Bruchteile von Stückzahlen werden nicht still aufgerundet. Einkaufsgebinde dürfen später separat aufgerundet werden, mit sichtbarer Differenz zur benötigten Menge. Zeiten, Temperaturen und Formgrößen werden nicht automatisch skaliert.

**Konsistenz beim Kochen:** Start aus einem Planeintrag öffnet dieselbe Rezeptversion und dieselbe Portionsvariante, die für die Einkaufsliste verwendet wurde. Der Kochmodus zeigt Originalmenge und berechnete Zielmenge klar unterscheidbar. Zahlen in Freitext-Schritten dürfen nicht mit einem anderen Maßstab stehen bleiben: sie müssen auf belegte Zutatenbezüge verweisen oder bei fehlender Zuordnung ausdrücklich „Originalmenge – Anpassung prüfen“ zeigen. Originaltext bleibt zugänglich.

„Für morgen mitkochen“: Eine Kochcharge kann mehrere Mahlzeiten versorgen. Die Einkaufsliste zählt ihre Zutaten nur einmal. Ein zweiter Tag kann auf diese Charge als Resteverwendung verweisen; ein bewusst zweites Kochen desselben Rezepts ist eine zweite Charge und wird erneut eingekauft.

## 6. Einkaufsliste automatisch aus jedem Plan

Beim Übernehmen des Plans wird eine Liste aus **allen zugehörigen Kochchargen** erzeugt. Änderungen am gespeicherten Plan berechnen sie automatisch neu. Benutzer sehen kurz den Abgleich „2 Zutaten geändert“, nicht kommentarlos eine veraltete Liste. Entwürfe können eine Vorschau zeigen; die aktive Liste gehört immer zu einer konkreten gespeicherten Planrevision.

### Zusammenführen und Anzeigen

- Gleiche fachliche Zutat plus passende Variante und kompatible Einheit zusammenfassen: 200 g + 300 g Karotten = 500 g. „Karotten“/„Möhren“ können über einen bestätigten gemeinsamen Begriff zusammengeführt werden.
- Masse mit Masse, Volumen mit Volumen, Stück mit kompatibler Stückgröße. g/kg und ml/l deterministisch umrechnen. Masse/Volumen nicht ohne passenden Dichtefaktor mischen.
- Roh/gegart, frisch/getrocknet, unterschiedliche Fettstufen, spezielle Mehle oder abweichende Produkte nicht unbemerkt verschmelzen. Gewünschte Gleichsetzung als bewusste Nutzerentscheidung speichern.
- Herkunft jeder Zeile zeigt Rezepte, Tage, Chargen und Einzelmengen. Die Summe lässt sich nachvollziehen.
- Bereiche wie „1–2 EL“ als Bereich summieren; „etwas Salz“ als offene Zeile erhalten. Unbekannte Mengen führen zu „Menge prüfen“, nicht zum Weglassen einer Zutat.
- Gruppieren nach Gemüse/Obst, Fleisch/Fisch, Kühlregal, Trockenwaren, Gewürze und Sonstiges. Große Abhakfelder, Druck-/Textansicht.
- Zusätzliche freie Einkaufspositionen bleiben möglich und werden bei Neuberechnung nicht gelöscht.

### Vorrat und bereits gekaufte Mengen

Benötigte Menge, zugeteilter Vorrat und bereits gekaufte Menge getrennt führen. Für bekannte Einheiten gilt `noch kaufen = max(0, Bedarf − Vorrat − gekauft)`. Eine allgemeine Vorratsverwaltung ist nicht nötig; für die erste Version reicht eine listenbezogene Zuordnung. Wasser, Salz oder Öl nicht automatisch als vorhanden voraussetzen.

Ein Häkchen kann die aktuell offene Menge als gekauft verbuchen. Steigt der Bedarf später, erscheint nur der zusätzliche Bedarf wieder offen. Beispiel: 500 g Karotten abgehakt, Plan erweitert auf 800 g → 300 g wieder offen. Sinkt der Bedarf, gekaufte Mengen nicht löschen, sondern möglichen Überschuss zeigen. Bei unbekannten Mengen muss eine veränderte Herkunft die Zeile wieder zur Prüfung öffnen.

Bei Entfernen eines Gerichts werden seine Beiträge entfernt; manuelle Notizen, freie Positionen und tatsächlich gekaufte Mengen bleiben erhalten. Verwaiste Vorrats-/Kaufzuordnungen werden als solche angezeigt. Überschreiben eines gesamten Einkaufsdokuments mit jedem KI-Aufruf ist ausgeschlossen.

## 7. Technischer Vertrag

| Objekt | Wesentliche Felder |
| --- | --- |
| `RecipeTagAssignment` | Rezeptversion, Tag-ID/Dimension, Ursprung, Beleg, Status, Nutzer-Override, Klassifikationsversion |
| `IngredientFoodMapping` | Zutaten-ID, Lebensmittel-ID/Quelle/Version, Zustand, Mengenumrechnung/Faktorherkunft, Prüfstatus |
| `NutritionEstimate` | Rezeptversion, Mappingrevision, Datenversion, Werte und Einheiten, Bezugsbasis, Vollständigkeit je Nährstoff, fehlende Beiträge, Berechnungszeit |
| `CookingEvent` | Rezeptversion, Zeitpunkt, tatsächlich als gekocht bestätigt; Planen allein zählt nicht als gekocht |
| `MealPlan` / `MealPlanRevision` | Eigentümer, Zeitraum, Zeitzone, Revision, Status Entwurf/übernommen, Präferenzen |
| `MealSlot` | Datum, Mahlzeit, optionale mehrere Komponenten, fixiert, Herkunft manuell/Vorschlag |
| `CookingBatch` | Rezeptversion, Portionen/Rezeptmengen, Basis der Skalierung, Kochtag; stabile Identität |
| `MealAllocation` | Zuordnung von Portionen einer Charge zu einem Mahlzeiteneintrag; Summe darf Chargenmenge nicht überschreiten |
| `ShoppingList` | Planrevision, Berechnungsrevision, Aktualitätsstatus, freie Positionen |
| `ShoppingContribution` | stabile Referenz zu Charge und Zutaten-ID, Originalmenge, Planmenge, Aggregationsschlüssel |
| `ShoppingAdjustment` | fachlicher Zutatenschlüssel, Vorrats-/Kaufmenge mit Einheit, Notiz; unabhängig von laufender Summenberechnung |

Alle privaten Tabellen und abgeleiteten Such-/Planungszugriffe erhalten dieselbe Eigentümerprüfung und RLS wie Rezepte. Öffentlicher Nährwertkatalog und private Rezeptzuordnungen sind getrennt. Keine gesamten Familienrezepte an eine Nährwertsuche senden; nur notwendige Lebensmittelbegriffe/IDs, möglichst lokal aus dem importierten Katalog zuordnen.

Plan übernehmen und Einkaufsrevision publizieren atomar, oder neue Planrevision zunächst explizit „Liste wird aktualisiert“ markieren; die Oberfläche darf keine alte Liste als aktuell bezeichnen. Optimistische Versionsprüfung schützt Änderungen auf zwei Geräten. Mengenrechnung, Summierung und Einkaufsabgleich erfolgen deterministisch und idempotent ohne KI; Geld-/Gesundheitsoptimierung ist nicht Teil dieses Plans.

Automatische Vorschläge werden vor Übernahme gegen erlaubte eigene Rezept-IDs, aktuelle Rechte, Ausschlüsse, Mengenbasis, Fixierungen und Einmalzählung von Chargen validiert. Eine defekte KI-Antwort lässt den bisherigen Plan unverändert. Nährwertausfall blockiert den Planner nicht; unbekannte Nährwerte erfüllen keinen expliziten numerischen Nährwertfilter.

Offline: letzter heruntergeladener Wochenplan und Liste sind lesbar, Einkäufe können mit stabilen Aktions-IDs lokal abgehakt und später abgeglichen werden. Neue Pläne und Änderungen an Rezepten/Portionen brauchen in Version 1 Internet. Ein gleichzeitiger Planwechsel wird beim Abgleich sichtbar; Kaufmengen werden nicht verworfen oder doppelt verbucht.

Export/Sicherung umfassen auch Tag-Overrides, Nährwertzuordnungen/Quellen, Planrevisionen, Chargen, Einkaufslisten und Kochhistorie. Der Nährwertkatalog muss über Version und Quelle wieder beschaffbar sein; private Ergänzungen werden mitexportiert.

## 8. Konkrete Funktionsabnahme

- F01: Titel-, Zutaten- und Tag-Suche mit Umlauten, Synonymen und kombinierbaren Filtern; keine fremden Treffer. Unbekannte Dauer wird nicht als null Minuten behandelt.
- F02: Gemüse-Fleisch-Suppe erhält zutreffende Mehrfach-Tags; wird nicht als vegetarisch vorgeschlagen. Nutzerkorrektur bleibt nach Reanalyse erhalten.
- F03: Synthetischer Nährwertdatensatz mit bekannten Grammwerten ergibt exakt die erwarteten Summen; fehlende Menge oder fehlender Nährstoff wird nicht als null gerechnet.
- F04: Roh/gegart, Portionen unbekannt, EL ohne Faktor, bekannte Endmasse und Original-Nährwert mit anderer Bezugsbasis jeweils korrekt behandeln. Geänderte bestätigte Version löst neue Rechnung aus.
- F05: Selbst drei Gerichte wählen → Plan übernehmen → vollständige Einkaufsliste ohne zweiten Erstellungsauftrag. Dasselbe für einen automatisch vorgeschlagenen und einen gemischten Plan.
- F06: Portionen ändern, Gericht ersetzen/entfernen und Dessert hinzufügen: genau die betroffenen Beiträge aktualisieren, manuelle Positionen erhalten.
- F07: 200 g + 300 g ergeben 500 g; 500 g gekauft, neuer Bedarf 800 g ergibt 300 g offen. 1 l und 250 ml ergeben 1,25 l. g und ml ohne Dichte bleiben getrennt.
- F08: Original ohne Portionen verlangt Rezeptmengen oder eigene Berechnungsbasis. Im Original unveränderte Mengen nach Plan-Skalierung und Export nachweisen.
- F09: Eine Charge auf zwei Tage verteilt zählt einmal, zwei getrennte Chargen desselben Rezepts zweimal. Keine Überverteilung von Portionen.
- F10: Start aus dem Plan zeigt dieselben Mengen wie die Liste; nicht sicher zuordenbare Zahlen im Schritttext werden sichtbar zur Prüfung gestellt. Zeiten/Temperaturen unverändert.
- F11: Fixierte Tage, harte Ausschlüsse und fehlende Kandidaten respektieren. Keine erfundenen Gerichte bei kleiner Sammlung; „abwechslungsreich“ nicht als medizinisches Qualitätsurteil anzeigen.
- F12: Gleichzeitige Planbearbeitung, Abhaken im Offline-Modus, Wiederholen derselben Aktion und späterer Sync erzeugen weder verlorene noch doppelte Kaufmengen.
- F13: Export/Wiederimport erhält Verknüpfungen zwischen Rezeptversion, Plan, Chargen und Einkauf sowie persönliche Tagkorrekturen und Nährwertquellen.
- F14: Mengen wie „etwas“, Spannweiten und Bruchteile von Eiern bleiben sichtbar. Keine still verschwundenen Einkaufspositionen oder ungefragte Rundung.

Diese Fälle sind Spezifikation für Sol, keine bereits durchgeführten Tests einer fertigen App.
