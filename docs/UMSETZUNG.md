# Bauabschnitte und Übergabe an Sol

> **Umsetzungsstand 27.10.2026:** Dieses Dokument beschreibt den vollständigen Bauvertrag. Den tatsächlich implementierten lokalen Stand, Grenzen und Migration dokumentieren [README](../README.md), [Architektur-Ist](ARCHITEKTUR-IST.md) und [Prüfbericht](PRUEFBERICHT-2026-10-27.md). Zielvorgaben gelten dadurch nicht als abgenommen.

**Konzept v1.1 · 26. Oktober 2026**

## 1. Auftrag und Reihenfolge

Zuerst einen vollständigen, schmalen Ablauf bauen: Quelle auswählen → Original sichern → Entwurf erzeugen → prüfen → bestätigen → kochen → exportieren. Anschließend Zuverlässigkeit und Geräteverhalten fertigstellen. Kein großes Funktionsmenü vor diesem durchgängigen Ablauf.

Die nachfolgenden Abschnitte sind aufeinander aufbauende Lieferpakete. Ein Paket ist erst fertig, wenn sein Ergebnis überprüfbar ist. Der Eigentümer muss dafür kein Entwickler sein; jedes Paket erhält eine kurze verständliche Anleitung und einen sichtbaren Status.

## 2. Lieferpakete

| Paket | Ergebnis | Nachweis vor Abschluss |
| --- | --- | --- |
| **A — Bedienbarer Entwurf** | Responsive Oberfläche mit Sammlung, Quellenauswahl, Prüfmaske, Utensilien, Zutaten, Übersicht und Kochschritten; nur synthetische Beispieldaten. | Pfeile oben, große Tasten, Rückkehr zur gleichen Position, Darstellung bei 320/390/768/1024 Pixeln, Tastatur und Vergrößerung. Klar als Demo gekennzeichnet. |
| **B — Eigene Daten sicher speichern** | Anmeldung, privater Originalspeicher, Datenmodell, Versionen, sichere Uploads, automatisch ausgefüllter und vom Nutzer bestätigter Rezeptentwurf und dauerhafte Speicherung (Nutzerentscheidung 27.10.2026: kein manueller Übertragungsweg). | Zwei unabhängige Testkonten können weder Rezepte noch Originale des anderen abrufen. Neues Laden verliert keine Daten. Erste Sicherung und Rücksicherung funktionieren. |
| **C — Echte KI-Übernahme** | Worker, persistente Jobs, Bild-/PDF-Aufbereitung, Transkription, Strukturierung, Issues und Freigabe. | Reale Ende-zu-Ende-Analyse mit autorisierten Testquellen; fehlende Lesarten werden markiert; Modellfehler, Retry und Abbruch sichtbar. Kein scheinbar erfolgreicher Demo-Fallback. |
| **D — Kochen auf iPhone und iPad** | Installierbare PWA, feste Kochversion, Vordergrund-Timer, Wiederaufnahme, gezielt heruntergeladene Rezepte offline. | Installations- und Offlineprüfung auf echten iOS-/iPadOS-Geräten; Wake-Lock-Ausfall und Rückkehr nach Sperre behandelt. |
| **E — Archiv und Sicherung** | Vollständiger Export/Wiederimport, Druckansicht, Papierkorb, automatisierte Sicherung und einfache Betriebsanleitung. | Vollständige Sammlung in leerer Testumgebung wiederhergestellt, Original-Hashes identisch, kritische Archivtests bestanden. |
| **F — Finden und auswählen** | Suche, automatische korrigierbare Tags, Nährwerte mit Quellen und Rezeptvorschläge aus der eigenen Sammlung. | F01–F04 und relevante Vorschlagsfälle aus PLANUNG-UND-NAEHRWERTE.md. Unbekannte Werte bleiben unbekannt. |
| **G — Planen und einkaufen** | Manuelle, automatische und gemischte Menüplanung; Portionsvarianten, automatische Einkaufsliste und Abgleich nach Planänderungen. | F05–F14, beide Einstiege vollständig; Mengen konsistent bis zum Kochmodus; Export um neue Daten ergänzt. |

**A ist ein Prototyp. A bis E bilden den Kern; erst A bis G zusammen erfüllen den erweiterten Auftrag für die erste vollständige Version.** Suche/Tags und Planungsansichten können bereits in A vorbereitet werden, die echte Datenlogik folgt in F/G.

B beginnt mit Sicherung, bevor echte wertvolle Familienrezepte als einziges digitales Exemplar aufgenommen werden. E automatisiert und vervollständigt den Betriebsablauf. Ein nicht angeschlossener KI-Schlüssel blockiert lediglich den echten KI-Test, nicht die Arbeit an Darstellung, Domänenregeln oder synthetischen Tests.

## 3. Arbeitspakete innerhalb der Umsetzung

### A: Oberfläche

- Elegante Navy-/Blau-Gestaltung nach SmartOptimiert und docs/DESIGN.md; große Schrift und klare Flächen. Keine olivgrüne Papieroptik.
- Wiederverwendbare große Schaltflächen, Checklisten, Originalansicht und Schrittleiste.
- Routenzustände für „keine Rezepte“, „Import läuft“, „Prüfung nötig“, „Fehler“, „offline“, „kochen“.
- Die Fortschrittsanzeige beschreibt echte Zustände und erfindet keine Prozentzahlen.
- Das Demonstrationsrezept ist ausdrücklich künstlich; keine Bilder echter Familienhandschriften erfinden.
- Suche, Rezeptfilter und manuelles Zusammenstellen eines Menüplans in den Bedienentwurf aufnehmen; automatische Einkaufsliste anhand künstlicher Mengen zeigen. Abschluss: „Fertig gekocht. Guten Appetit!“

### B: Grundlage

- Workspace, Lockfile und CI mit Typprüfung, sinnvollen Tests und Produktionsbuild.
- Schema, Datenbankmigrationen, RLS und privater Speicher mit separatem Testkonto.
- Autorisierte Uploads, Inhaltsprüfung, Hashes, eindeutige Eigentümerbeziehungen.
- Versionierung und atomare Bestätigung als Domänenfunktionen, bevor KI hinzugefügt wird.
- `env.example` mit leeren Werten und verständlichen Beschreibungen; keine Geheimnisse in Git.

### C: Analyse

- Datei-Normalisierung einschließlich HEIC/Orientierung und mehrseitiger PDFs.
- Worker, Lease, Budgetreservierung, begrenzte Retries und strukturierte Fehlercodes.
- `REZEPTTREUE.md` in Schema und versionierte Prompts übertragen.
- Menschliche Prüfmaske mit vollständiger Gegenüberstellung; nicht bloß ein „Übernehmen“-Knopf nach einer KI-Zusammenfassung.
- Vergleich eines kleinen, repräsentativen Testbestands vor Auswahl des Produktionsmodells. Modell- und Promptversion festhalten.

### D: Nutzung beim Kochen

- Reihenfolge Utensilien → Zutaten → Übersicht → Schritte.
- Explizite Timer, feste Versionsbindung und lokale Speicherung des Kochzustands.
- Offlinepakete auf Vollständigkeit prüfen, Abmeldung bereinigt persönliche Caches.
- Installation erklären, Updates nach dem Kochen, Wiederanmeldung im Standalone-Modus testen.

### E: Erhaltung

- Vollständiger Export und kontrollierter Wiederimport mit Hashkontrolle.
- Sicherungsziel, Wiederherstellung und Zugriff des Eigentümers dokumentieren.
- Anbieterkonten sollen dem Eigentümer gehören; keine Abhängigkeit von Zugangsdaten eines Agenten.
- Versionshistorie, Papierkorbfrist als Startwert 30 Tage, endgültige Löschung separat.
- Aufbewahrungsdauer der Sicherungen im Produkt erklären: Papierkorb-Löschung bedeutet nicht sofortiges Entfernen aus jeder alten Sicherung. Nach einer Wiederherstellung Löschmarkierungen berücksichtigen.

## 4. Fertiger Startauftrag für Sol

Die konkreten F/G-Arbeitspakete, Datenobjekte und Abnahmetests stehen in [PLANUNG-UND-NAEHRWERTE.md](PLANUNG-UND-NAEHRWERTE.md). Gestaltung und Produkttexte folgen [DESIGN.md](DESIGN.md). Diese Erweiterung ist verbindlicher Umfang, keine optionale spätere Idee.

Der folgende Text ist für den späteren Baubeginn gedacht. Er erteilt in diesem Konzeptschritt noch keinen Auftrag an einen anderen Chat.

> Baue im bestehenden Projekt „Digitales Rezeptbuch“ die gleichnamige App. Der Appname „Digitales Rezeptbuch“ ist vom Eigentümer festgelegt. Lies zuerst AGENTS.md und die Dokumente unter docs/. Das Produktkonzept, die Regeln in REZEPTTREUE.md und die Abnahmekriterien bilden den Bauvertrag.
>
> Beginne mit Lieferpaket A: eine gut bedienbare responsive Vorschau des vollständigen Ablaufs mit ausdrücklich künstlichen Beispieldaten. Verwende große Bedienfelder und eine Kochansicht mit Zurück-/Weiter-Pfeilen oben. Zeige Utensilien, Zutaten und Rezeptüberblick vor den einzelnen Schritten. Lege gleichzeitig die fachlichen Typen und die vorgesehenen Zustandsübergänge an, ohne echte Erkennung vorzutäuschen.
>
> Setze danach B bis G in der dokumentierten Reihenfolge um, soweit die benötigten Konten und Schlüssel vorhanden sind. Nutze Next.js/TypeScript, Supabase und einen getrennten Node-Worker entsprechend ARCHITEKTUR.md. Implementiere auch Suche, automatische korrigierbare Tags, nachvollziehbar berechnete Nährwerte und Rezeptvorschläge. Jeder manuell, automatisch oder gemischt zusammengestellte Menüplan muss beim Übernehmen automatisch die passende Einkaufsliste erzeugen und diese bei Änderungen korrekt aktualisieren. Portionen in Plan, Einkauf und Kochansicht müssen zusammenpassen. Wenn eine bessere technische Lösung konkret belegt ist, dokumentiere Entscheidung und Auswirkungen, während Produktanforderungen und Originaltreue erhalten bleiben.
>
> Erfinde niemals Zutaten, Mengen, Temperaturen, Zeiten oder Schritte. Trenne Original, bestätigte Fassung und Ergänzungen. Jede KI-Übernahme braucht eine menschliche Freigabe. Bestätigte Versionen bleiben unveränderlich, und der Kochmodus verwendet eine feste Version ohne KI-Aufrufe beim Navigieren.
>
> Verwende die in DESIGN.md festgehaltene dunkle Navy-/Blau-Farbwelt aus SmartOptimiert. Keine olivgrüne Papiergestaltung. Schreibe am Ende ausschließlich „Fertig gekocht. Guten Appetit!“ mit sinnvollen Aktionen. Keine Generationen-Rhetorik und keine Selbstverständlichkeit wie „Dein Rezept bleibt erhalten“.
>
> Arbeite im vorhandenen Git-Repository mit kleinen nachvollziehbaren Commits. Schreibe keine echten Rezepte oder Geheimnisse in Git. Melde pro Lieferpaket, was wirklich funktioniert, wie es geprüft wurde und welche externen Voraussetzungen noch fehlen. Kostenpflichtige Dienste erst einrichten, wenn konkrete Anbieter, Kostenrahmen und die nötige Autorisierung vorliegen; bis dahin unabhängig weiterarbeiten. Eine lokale Vorschau ist keine fertige oder veröffentlichte App.

## 5. Definition der Fertigstellung

Ein Eigentümer kann ohne Entwicklerwissen ein eigenes Papier-/PDF-Rezept übernehmen, die Originaltreue überprüfen, es privat auf beiden Geräten finden, automatisch einordnen lassen, nachvollziehbare Nährwerte ansehen, Gerichte auswählen oder vorschlagen lassen, daraus einen Menüplan samt automatisch aktualisierter Einkaufsliste erhalten, mit großen Tasten kochen und seine Sammlung vollständig herausbekommen.

Die Veröffentlichung benötigt zusätzlich tatsächliche Anbieterzugänge, funktionierende Anmeldung, HTTPS, produktive Geheimnisse, verifizierte Sicherung und einen dokumentierten Kostenrahmen. Ein neuer Agent soll zuerst den bestehenden Stand prüfen und vorhandene Komponenten fortführen.

## 6. Git und Zusammenarbeit

Lokaler Standardbranch: `main`. Dokumentation und Quellcode gehören ins Repository; Originalrezepte, Uploads, Exporte, Sicherungen und Schlüssel nicht. `.gitignore` ist ein Schutz gegen Versehen und ersetzt die Sichtprüfung vor einem Commit nicht.

Das Konzept wird lokal versioniert. Ein privates Remote-Repository ist der nächste sinnvolle Sicherungsschritt beim Baubeginn; Anbieter und Eigentümerkonto sind noch nicht festgelegt. Ein lokales Git-Repository schützt nicht gegen den Ausfall dieses Rechners.

Falls auf dem Rechner noch keine Git-Autorenidentität eingerichtet ist, darf der erste Konzept-Commit transparent unter einer Agentenidentität erfolgen. Keine globale persönliche Git-Konfiguration erfinden oder ändern. Für spätere Nutzer-Commits kann der Eigentümer seine gewünschte Identität festlegen.

## 7. Entscheidungen, die bewusst später fallen

| Entscheidung | Wann erforderlich | Voreinstellung |
| --- | --- | --- |
| Tatsächliche Geräte/OS-Versionen | vor Paket D | aktuelle und vorherige verfügbare iOS-/iPadOS-Hauptversion prüfen |
| Hosting und monatliches Limit | vor echter Bereitstellung | verwaltete Dienste; Eigentümerkonten |
| KI-Modell | in Paket C nach Vergleich | austauschbarer Bildanalyse-Adapter |
| Familienzugänge | nach erster Abnahme | zunächst ein Eigentümer, Weitergabe per Export |
| Echte Testrezepte | vor Qualitätsbewertung in C | erst künstliche Beispiele, danach freigegebene private Quellen |

Diese Entscheidungen verhindern weder die Konzeptprüfung noch den Bau des lokalen Bedienentwurfs.
