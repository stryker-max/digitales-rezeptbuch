# Projektregeln — Digitales Rezeptbuch

## Auftrag und Status

Dieses Projekt startet als Bauplan für eine private Rezeptbuch-PWA. Der Eigentümer möchte die App später durch Sol umsetzen lassen. Solange nur das Konzept beauftragt ist, keine fertige Anwendung, laufende KI, erfolgte Veröffentlichung oder getestete Geräte behaupten.

Beim Baubeginn zuerst lesen: README.md, docs/KONZEPT.md, docs/ARCHITEKTUR.md, docs/REZEPTTREUE.md, docs/UMSETZUNG.md, docs/ABNAHME.md, docs/PLANUNG-UND-NAEHRWERTE.md und docs/DESIGN.md. Spätere ausdrückliche Nutzerentscheidungen gehen diesen Projektvorgaben vor; betroffene Dokumente dann konsistent aktualisieren.

## Unverhandelbare Produktregeln

- Der vom Eigentümer festgelegte Appname lautet „Digitales Rezeptbuch“. Diesen Namen in Oberfläche, Installation und Dokumentation verwenden.
- Originaldateien unverändert bewahren. Arbeitskopien getrennt halten.
- Keine Zutaten, Mengen, Einheiten, Temperaturen, Zeiten, Schritte, Bedingungen oder Alternativen erfinden, entfernen oder still verändern.
- Fehlende, unleserliche, abgeleitete und vom Nutzer ergänzte Angaben klar unterscheiden.
- KI-Rezeptübernahmen sind Entwürfe. Freigabe serverseitig prüfen und nur durch den Nutzer auslösen. Automatische Zusatzmetadaten folgen den gesonderten Regeln für Tags/Nährwerte und geben keinen Rezepttext frei.
- Jede Rezeptfassung und jeder relevante Quellblock müssen nachvollziehbar sein. Formale Schemaerfüllung ist kein Richtigkeitsbeweis.
- Bestätigte Versionen bleiben unveränderlich. Kochsitzungen binden sich an eine feste Version.
- Große Touchfelder, klare deutsche Texte und obere Zurück-/Weiter-Pfeile sind Kernanforderungen.
- Beim Wechsel der Kochschritte bleiben Zurück und Weiter exakt an derselben Position und gleich groß. Navigation unabhängig vom wechselnden Inhalt aufbauen; am Anfang/Ende nur deaktivieren, nicht entfernen oder versetzen. Einzelheiten und Referenzentwurf in docs/DESIGN.md.
- Kochen braucht nach bestätigter Speicherung keine KI. Keine zusätzlichen KI-Aufrufe beim Blättern.
- Utensilienvorschläge und Zeitschätzungen immer als Zusatz kennzeichnen; sie verändern das Original nicht.
- Automatische Tags sind korrigierbare Metadaten. Nährwerte aus nachvollziehbaren Lebensmitteldaten berechnen, Unsicherheiten zeigen, nie frei von der KI erfinden lassen.
- Beide Planungswege sind verpflichtend: Rezepte selbst auswählen und automatisch vorschlagen lassen. Jeder übernommene Plan erzeugt automatisch eine Einkaufsliste; spätere Änderungen aktualisieren Mengen, ohne bereits gekaufte Mengen oder manuelle Positionen zu verlieren.
- Planportionen, Einkauf und Kochansicht müssen dieselbe getrennte Portionsvariante verwenden. Originalmengen unverändert erhalten; Zeiten/Temperaturen nicht automatisch skalieren.
- Design: Navy/Blau entsprechend docs/DESIGN.md. Keine olivgrüne Papieroptik. Abschluss ausschließlich „Fertig gekocht. Guten Appetit!“ mit passenden Aktionen; keine Generationen-Rhetorik oder Selbstverständlichkeiten über gespeicherte Rezepte.

## Technische Arbeitsweise

- Bestehenden Git-Stand prüfen und vorhandene Arbeit erhalten. Kleine nachvollziehbare Commits; keine fremde Git-Identität erfinden und globale Konfiguration nicht ändern.
- Geheimnisse, echte private Rezepte, Uploads und Sicherungen niemals committen. Synthetische Testquellen deutlich kennzeichnen.
- Private Daten serverseitig schützen: Eigentümerprüfung, RLS für Tabellen/Dateien, validierte Eingaben, keine Service-Schlüssel im Browser.
- Längere Analyse in persistenten Jobs mit eigenem Worker. Ein laufender Browser oder ein flüchtiger Webrequest ist kein Job-System.
- Beim Fehlen eines API-Schlüssels darf die lokale Entwicklung mit ausdrücklich markierten Beispielen weitergehen. Kein stiller Demo-Fallback in echter Analyse.
- Relevante Abnahmetests aus docs/ABNAHME.md ausführen; tatsächliche Geräteprüfungen getrennt von Browseremulation berichten.
- Architekturänderungen mit Grund, Auswirkungen und Migration dokumentieren. Keine zusätzliche Zustimmung für gewöhnliche reversible Implementierungsentscheidungen erfinden; vorhandene Nutzerautorisierung beachten.
- Kostenpflichtige Dienste, externe Veröffentlichung und echte Rezeptübertragung nur innerhalb der tatsächlichen Nutzerautorisierung durchführen. Fehlende Konten spät und konkret benennen; unabhängige Arbeit fortsetzen.
- Keine automatischen Nachrichten an andere Chats oder Personen. Dieser Bauplan verlangt keine Unteragenten.

## Fertig bedeutet

Import, vollständige Prüfung, Bestätigung, private dauerhafte Speicherung, gut bedienbares Kochen, Offlinepaket, Suche, automatische Tags, nachvollziehbare Nährwerte, Rezeptvorschläge, manuelle/automatische Menüplanung mit automatischer Einkaufsliste sowie vollständiger Export mit nachgewiesenem Wiederimport. Ein Mockup oder isolierter KI-Demoaufruf erfüllt das nicht. Bei Übergaben ehrlich zwischen Konzept, Demo, implementiert, getestet und produktiv unterscheiden.
