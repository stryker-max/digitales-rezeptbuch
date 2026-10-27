# Prüfbericht: Abo und automatische Foto-Übernahme

27. Oktober 2026. Ersetzt für den aktuellen Stand die Aussagen des früheren [Prüfberichts](PRUEFBERICHT-2026-10-27.md) zur manuellen Übernahme und noch fehlenden KI-Extraktion.

## Tatsächlich bestanden

- `npm test`: **26/26**. Rezeptgliederung und wortgetreue Feldbelege, fehlende Quellblockabdeckung, erfundene Mengen, mehrdeutige Portionsspannen, Lesefragen, unveränderliche Freigabe, Joblimits, Provider-/Profiltrennung, Originalprüfung, Export/Restore, Plan/Einkauf, Metadaten und Windows-DPAPI einschließlich Manipulationsabwehr.
- `npm run test:chatgpt`: **58 bestanden, 1 auf Windows übersprungen**. Übernommene DevKit-Prüfungen für OAuth, Nonce/Identität, Tokenrotation, verschlüsselte Speicherung, widerrufene Zugänge, HTTP-/Streamfehler und Abbruch. Zusätzliche Tests für lokale Bild-/PDF-Daten und strukturierte Ausgabe; entfernte Datei-URLs werden abgewiesen. Unix-Berechtigungstest auf Windows nicht anwendbar.
- Typprüfung für Web, Pages und beide Worker bestanden. Next.js-Produktionsbuild mit Webpack und Offlinepaket (26 Dateien) sowie statischer Pages-Build bestanden. Vite meldet erwartete Hinweise zu den im reinen Clientbuild nicht benötigten `use client`-Direktiven.
- **7 Produktions-Browsertests**: neue automatische Übernahme mit ausdrücklich erteiltem Übertragungs-Opt-in; vorher kein Upload. Vollständig ausgefüllter Entwurf und Speicherung ohne Rezepttexteingabe. Offene Lesefrage blockiert die Bestätigung; serverseitige Klärung/Bestätigung, Original bytegleich. Feste Kochpfeile bei 320/390/768/1024 px. Plan, bereits gekaufte Mengen, freie Positionen, Metadaten, Originalnotizen und automatische Herkunft in Export/Restore erhalten. Offline vollständig neu laden und Kochposition wieder aufnehmen. Nicht konfigurierte Analyse erzeugt keinen Demo-Erfolg; fremder Ursprung darf nicht schreiben.
- **1 Pages-Browsertest**: gültiges künstliches Sammlungsarchiv mit PNG-Original wiederherstellen, exportieren, Offlinepaket prüfen, offline neu laden und eigenes Rezept kochen. Kein manueller Eingabeweg, keine API-Anfragen, keine Browserfehler und kein horizontaler Überlauf bei 390 px.

Alle Browsertests mit isolierten Chrome-Profilen und künstlichen Quellen. Der Produktions-E2E-Test speist ausdrücklich ein synthetisches Analyseergebnis in die echte lokale Warteschlange ein; er ist kein Test der Modellqualität und ruft keinen Anbieter auf. Die Sicherungsprüfung liest die tatsächlichen Download-Blobbytes und importiert sie in einen leeren Browserkontext; das Kopieren einer Chrome-Temporärdatei an einen beliebigen Betriebssystemzielpfad wird nicht behauptet.

## Echte Abo-Verbindung

Offizielle Anmeldung und Freigabe durch den Nutzer abgeschlossen; eigene App-Registrierung. Tatsächlicher Kontomodellkatalog geladen. Textaufruf erfolgreich. Danach je ein künstliches PNG/PDF als Abschrift und je ein PNG/PDF mit neuem Schema als vollständig gegliedertes Rezept erkannt, ohne API-Schlüssel oder bezahlten API-Fallback. Tatsächliches Modell `gpt-6.1-sol` aus dem Konto.

Die Testquelle enthält „Test-Apfelpfanne“, 2 Portionen, 1 Stück Apfel, 10 g Butter sowie Schneiden und kurzes Braten. Diese Angaben in beiden neu gegliederten Ergebnissen erhalten. Strukturierte Zutaten/Schritte automatisch ausgefüllt, keine offenen Lesefragen bei dieser gut lesbaren Vorlage. Serveroriginale PNG/PDF bytegleich. Den echten PNG-Entwurf im isolierten Browser ohne Abtippen bestätigt und lokal gespeichert; keine Browserfehler. Screenshot visuell geprüft: unveränderte Vorlage links, fertig gegliedertes Rezept rechts, Korrekturfelder eingeklappt, „Geprüft speichern“ sichtbar.

Die lokale sichere Speicherung verwendet Windows-DPAPI. Normale Windows-Datei-/Prozessrechte waren für isolierte DevKit-Speichertests, Produktionsbuild und Browserstarts erforderlich; die eingeschränkte Umgebung blockierte entsprechende Dateizugriffe. Mit normalen Rechten erfolgreich wiederholt. Kein Verzicht auf Verschlüsselung und keine Änderung globaler Git-Identität.

## Verbleibende Grenzen

Keine persönlichen Rezepte übertragen, keine Handschrift-/Qualitätsabnahme auf vielfältigen Originalen. Eine Referenz auf einen Block beweist nicht, dass jedes Wort innerhalb des Blocks korrekt gelesen oder verwendet wurde. Der Originalvergleich und die Nutzerbestätigung bleiben erforderlich; vollständig selbsttätige Freigabe ist nicht implementiert.

Keine echte iPhone-/iPad-/Safari-Kameraprüfung, HEIC-Erkennung oder vollständige Geräte-/Schriftgrößenabnahme. Kein Cloudkonto, keine RLS-geschützte gemeinsame Sammlung und keine automatische Gerätesynchronisierung. Die offizielle lokale Abo-Anbindung ist keine Freigabe für eine beliebige ferngehostete Abo-Web-App. GitHub Pages bleibt ohne Analyseserver; private Originale und Anmeldedaten werden nicht veröffentlicht.

Nährwerte weiterhin nur aus importiertem nachvollziehbarem Lebensmittelkatalog mit bewusster Zuordnung; kein kompletter BLS-/USDA-Bestand und keine sichere automatische Lebensmittelzuordnung. Weitere Grenzen und nächste Arbeiten stehen in README und Architektur-Ist.
