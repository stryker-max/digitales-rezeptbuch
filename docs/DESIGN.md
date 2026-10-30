# Gestaltung und Sprache

> **Umsetzungsstand 27.10.2026:** Dieses Dokument beschreibt den vollständigen Bauvertrag. Den tatsächlich implementierten lokalen Stand, Grenzen und Migration dokumentieren [README](../README.md), [Architektur-Ist](ARCHITEKTUR-IST.md) und [Prüfbericht](PRUEFBERICHT-2026-10-27.md). Zielvorgaben gelten dadurch nicht als abgenommen.

**Designvorgabe v1.2 · 26. Oktober 2026**

## Referenz

Der Nutzer wünscht eine elegante dunkle Oberfläche ungefähr in der Farbgebung seiner App **SmartOptimiert**. Deren lokale Farbdefinitionen wurden in `C:/Users/marku/Documents/Projekte/smartoptimiert/src/ui/theme.js` gelesen; ergänzend die Flächen-/Kartenregeln in `src/ui/financial-overview.css`. Das Referenzprojekt wurde nicht verändert. Dies ist eine Ableitung aus dem Quellcode, keine Behauptung über die aktuell persönliche Theme-Einstellung im laufenden Browser.

Die zuvor vorgeschlagenen olivgrünen Akzente und die Papieroptik sind durch die neue Vorgabe ersetzt.

## Farbpalette

| Rolle | Farbe | Herkunft / Einsatz |
| --- | --- | --- |
| Hintergrund | `#0F172A` | SmartOptimiert Dark-Standard |
| Hauptflächen | `#1C2B40` | Karten, Menüs, Dialoge |
| Eingabeflächen | `#17253A` | Suche, Filter, dezente Untergliederung |
| Tiefere Fläche | `#132031` | Navigation, bei Bedarf |
| Kontur | `#2A3F5A` | leise Trennung, nicht alleiniger Fokusindikator |
| Haupttext | `#D8E8F8` | Titel, Anweisungen |
| Nebentext | `#8BA8C0` | Begründungen, Metadaten; Kontrast je Fläche prüfen |
| Primärer Akzent | `#4F80E2` | aktive Hauptaktionen und ausgewählte Bereiche |
| Heller Akzent | `#7DAAFF` | Links, Fokus-/Auswahlhinweise, kleine Akzente |

Für gefüllte blaue Buttons dunklen Text `#0F172A` prüfen; Weiß auf `#4F80E2` nicht ungeprüft für kleine Beschriftungen übernehmen. Mindestkontrast als Abnahmeziel: 4,5:1 für normalen Text, 3:1 für große Schrift und wesentliche Bedienelementgrenzen. Insbesondere Checkboxen brauchen eine klarere Kontur als rein dekorative Kartenränder.

Hellmodus bleibt möglich, mit derselben Informationsstruktur und blauem Akzent. Die aktuelle Konzeptvorschau zeigt ausdrücklich den gewünschten dunklen Modus. Die spätere App unterstützt System/Hell/Dunkel, ohne Rezeptdaten zu verändern.

## Form und Bedienung

- Klare Systemschrift, ruhige Typohierarchie, viel Abstand; kein Handschriftfont für Anweisungen.
- Karten mit etwa 18–22 Pixel Radius, dezente Tiefe, kleine einheitliche Symbole, sparsame Akzente. Kein farbiger Status für jede Rezeptkategorie.
- Rezeptfotos dürfen groß wirken, wenn echte Bilder vorhanden sind. Fehlende Bilder erhalten eine ruhige Textdarstellung, keine als Originalfoto getarnte KI-Illustration.
- Hauptnavigation: **Rezepte · Wochenplan · Einkauf**. „Rezept hinzufügen“ bleibt eine gut sichtbare Aktion. Kochmodus hat seine eigene klare Navigation.
- iPad: Sammlung/Plan und zugehörige Details können nebeneinander stehen. iPhone: gestapelte Ansichten und gut erreichbare Aktionen. Kein sieben Spalten breiter Zwangskalender auf dem Telefon.
- Große Bedienelemente bleiben verbindlich: Hauptaktionen mindestens 64 Pixel hoch, weitere Ziele mindestens 48 × 48. Kompakte Details aus SmartOptimiert nicht samt kleiner Schrift übernehmen.
- Sichtbare Fokusmarkierung, deutliche Checkboxen, lesbare Fehlermeldungen, keine Bedeutungen nur über Farbe.

## Ton und Abschluss

Kurz, natürlich, funktional. Keine belehrenden Selbstverständlichkeiten und keine Generationen-Rhetorik in Produkttexten.

**Verbindlicher Abschluss im Kochmodus:**

> Fertig gekocht.
>
> Guten Appetit!

Daneben beziehungsweise darunter sinnvolle Aktionen wie „Zur Sammlung“ und optional „Als gekocht merken“. Kein Satz „Dein Rezept bleibt erhalten“ und kein Zusatz „Für das nächste Mal und die nächste Generation“.

Der festgelegte Appname lautet **„Digitales Rezeptbuch“**. Geeigneter kurzer Untertitel: **„Deine Rezepte. Einfach gut kochen.“** Die Wortmarke darf zweizeilig stehen, damit sie auch auf schmalen Bildschirmen vollständig lesbar bleibt.

Sicherungen und Export bleiben technische Funktionen und erhalten sachliche Texte wie „Sammlung exportieren“ oder „Letzte Sicherung“. Keine wiederholten Archivierungsbotschaften während des Kochens.

## Überarbeiteter App-Entwurf

Der zusammenhängende Entwurf in `design/rezept-erbe-design.html` ersetzt die erste, einzelne Rezeptkarte als Gestaltungsreferenz. Er ist eine interaktive Vorschau mit vier künstlichen Beispielrezepten, keine produktive Anwendung. Die folgenden Bildreferenzen stammen aus der tatsächlichen Browserdarstellung vor der Namensentscheidung; der aktuelle Name steht in der interaktiven Quelle:

- [Sammlung auf breiter Ansicht](../design/sammlung-ipad.png)
- [Kochansicht auf schmaler Ansicht](../design/kochen-iphone.png)
- [Abschluss mit unveränderter Navigation](../design/abschluss-ipad.png)

Die Sammlung bekommt ein großes ausgewähltes Rezept mit Bild, eine klar abgesetzte Suchzeile und weitere Rezeptkarten. Am Telefon stehen Foto und Kurzangaben bei den kleinen Karten nebeneinander; das Hauptrezept steht unter seinem Bild. Bilder zeigen das Essen, während Titel und Bedienelemente auf ruhigen, undurchsichtigen Flächen liegen.

Die Rezeptdetails kombinieren Foto, Zeit, Portionen, Zutaten und eine deutlich hervorgehobene Aktion „Rezept kochen“. Der Wochenplan verwendet Tageskarten mit Rezept, Portionen und Austauschaktion, auf dem Telefon untereinander. Die Einkaufsliste gruppiert nach Warenbereich; jede Zeile zeigt Menge und Herkunftstage. Abgehakte Mengen bleiben bei einer späteren Erhöhung der Planportionen berücksichtigt.

Typografie: Manrope mit Systemschrift als Rückfall. Überschriften 28–36 px, Kochanweisungen 26–29 px, regulärer Text 15–18 px. Kleine Zusatzangaben dürfen die wesentlichen Rezeptinformationen nicht ersetzen. Der Entwurf hellt Haupttext auf `#E6EFF9`, Nebentext auf `#9FB3CB` und gefüllte Hauptaktionen auf `#8BB5FF` mit dunkler Beschriftung `#0A1624` auf. Die Navy-Flächen bleiben an SmartOptimiert angelehnt.

Die Beispielbilder sind eigens KI-generiert und ausdrücklich als solche gekennzeichnet. Sie sind keine Fotos der gespeicherten Gerichte und keine Quelle für Zutaten. Herkunft und vollständiger Bildauftrag stehen in `design/ASSETS.md`. In der echten App keine Bilder erfinden oder aus einem Bild zusätzliche Rezeptzutaten ableiten.

## Verbindlich: Die Pfeile bleiben am selben Platz

**Bei jedem Klick auf „Weiter“ oder „Zurück“ behalten beide Schaltflächen ihre Position und Größe.** Unterschiedliche Textlängen, Zutatenlisten, Vorlagenansicht und Abschluss dürfen sie nicht versetzen.

1. Die Navigation steht oberhalb des wechselnden Inhalts in einer eigenen, durchgehend vorhandenen Leiste: Zurück links, Fortschritt mittig, Weiter rechts.
2. Beide Schaltflächen bleiben mindestens 64 px hoch. Die mittlere Spalte hat eine feste Breite; wechselnde Zähler und Beschriftungen verschieben die Pfeile nicht.
3. Nicht verfügbare Pfeile werden deaktiviert und behalten ihren Platz. Auf „Fertig gekocht.“ bleibt der Weiter-Button vorhanden und deaktiviert; „Zur Sammlung“ ist eine separate Aktion im Inhalt.
4. Beim Blättern nicht die ganze Kochansicht neu aufbauen. Bestehende Buttons und ihr Fokus bleiben erhalten. Keine Animation oder automatische Scrollbewegung beim Schrittwechsel.
5. Der Entwurf legt die Inhalte auf dieselbe CSS-Grid-Fläche. Auch inaktive Ansichten bestimmen deren Höhe, sind aber unsichtbar, `inert` und aus dem Accessibility-Baum genommen. Damit ändert sich auch die Gesamthöhe beim Blättern nicht. Lange Inhalte werden nicht abgeschnitten.
6. Für die echte PWA die Navigation zusätzlich am oberen Rand des Kochbereichs halten, einschließlich iOS-Sicherheitsabständen. Lange Anweisungen müssen unter der erreichbaren Leiste lesbar bleiben. Die Inline-Vorschau ist kein Nachweis für dieses Verhalten einer installierten PWA.
7. Nach einem bewussten Wechsel von Ausrichtung oder Schriftgröße darf sich das Layout neu anordnen; beim anschließenden Blättern muss es wieder stabil sein. Die gesamte Rezeptfassung bleibt verfügbar.

## Prüfstand des Entwurfs

Am 26. Oktober 2026 im Browser geprüft: Sammlung, Suche nach „tomaten“, Auswahl eines Gerichts für Donnerstag, Übernahme des manuellen Plans, automatische Summierung und Portionsänderung nach dem Abhaken einer Zutat. Beispiel: Zwei gekaufte Zwiebeln bleiben berücksichtigt; bei drei benötigten Zwiebeln erscheint eine weitere als offen.

Bei 1024 und 390 px Browserbreite wurden sämtliche acht Kochansichten durchlaufen. Die gemessenen Rechtecke beider Pfeile und die Gesamthöhe waren jeweils in allen acht Ansichten identisch. [Messdaten](../design/navigation-pruefung.json). Bei 320 px Browserbreite wurden die schmale Navigation und der Wechsel zur Beispielvorlage und zurück zusätzlich geprüft: kein horizontaler Überlauf, identische Pfeilpositionen. Keine JavaScript-Fehler im Browserprotokoll.

Dies sind Prüfungen der Vorschau. Echte iPhone-/iPad-Geräte, VoiceOver, 200 % Schriftvergrößerung, Kamera, KI-Übernahme, dauerhafte Speicherung und installierter PWA-Betrieb bleiben Teil der späteren App-Abnahme.

## Nutzungsentscheidung · 30.10.2026

Der Nutzer wünscht eine normale, am SmartOptimiert-Einstieg orientierte Anmeldung und die gemeinsame Nutzung mit seiner Freundin. Umsetzung: eigenständige mobile Login-Karte mit E-Mail/Passwort, optionalem Face ID und privaten Haushaltseinladungen. Keine Anmeldung als großes technisches Panel über der Sammlung. Eigene Personen, gemeinsame Sammlung/Plan/Einkauf. Root-Container berücksichtigen Innenabstände in der Bildschirmbreite; Eingaben mindestens 16 px, flexible Schaltflächen, iOS-Sicherheitsabstände. Bei 320/360/375/390/430/768 px im Browser geprüft.

„Offline-Paket prüfen“ und „Update laden“ sind aus dem normalen Produktfluss entfernt. App-Dateien und Updates werden im Hintergrund behandelt; laufende Eingaben und Kochschritte nicht unterbrechen. Ein kurzer verständlicher Hinweis erscheint nur ohne Internet. Diese ausdrückliche Entscheidung ersetzt die frühere sichtbare technische Bedienung.
