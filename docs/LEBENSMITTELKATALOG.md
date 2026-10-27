# Lebensmittelkatalog für die lokale Nährwertrechnung

Echter BLS-/USDA-Bestand noch nicht enthalten. Geeignete Daten müssen mit Quelle, Version, Zustand und Lizenz in das folgende Format überführt werden. Bis 1 MB je Datei und insgesamt 500 Einträge.

**Rein synthetischer Rechentest, keine Ernährungsdaten:**

```json
{
  "version": 1,
  "foods": [{
    "id": "synthetic-test-only-v1",
    "name": "Künstlicher Rechentest, kein Lebensmittel",
    "state": "synthetisch",
    "source": "Selbst erzeugte Testwerte, nicht zum Ernährungsgebrauch",
    "version": "Test 1",
    "license": "Synthetische Testdaten",
    "per100g": { "kcal": 100, "protein": 10, "carbs": 20, "fat": null }
  }]
}
```

Alle vier Nährstofffelder sind Pflicht; fehlende Werte `null`, keine künstliche Null. Grammwerte beziehen sich auf 100 g im angegebenen Zustand. Neue Datenversionen benötigen neue IDs; abweichende Werte unter vorhandener ID werden abgewiesen. Kataloge werden ergänzt und löschen keine vorhandenen Zuordnungen.

In Rezeptdetails „Lebensmittelkatalog laden“, dann passende Lebensmittel/Zustände bewusst zuordnen. Roh/gegart, Fettstufe, Marke und essbarer Anteil müssen passen. Unsichere Zuordnung offen lassen. Danach aktualisiert sich die Rechnung automatisch.

250 g × 100 kcal/100 g ergeben 250 kcal für die Rezeptmenge; bei zwei bekannten Portionen 125 kcal je Portion. Fehlende Mengen, Umrechnungen oder Werte ergeben eine unvollständige Teilsumme mit Lückenliste je Nährstoff. Keine automatische ml-/EL-/Stück-zu-Gramm-Annahme. Kein Ergebnis pro 100 g fertiges Gericht ohne Endgewicht. Garverluste und aufgenommenes Bratfett nicht eingerechnet.

Katalog samt Quellen/Lizenzen und private Zuordnungen sind in Sicherung v2 enthalten. Automatischer BLS-Import und sichere automatische Zuordnung bleiben offen.
