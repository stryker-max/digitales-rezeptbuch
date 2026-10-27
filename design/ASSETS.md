# Bildmaterial und Entwurfsquelle

Stand: 26. Oktober 2026. Alle Rezeptdaten und Gerichte dieser Vorschau sind künstliche Beispiele. Keine privaten Originalrezepte wurden verwendet.

## Dateien

- `rezept-erbe-design.html`: editierbare Quelle der interaktiven Vorschau als HTML-Fragment. Im Visualisierungsrenderer öffnen; noch keine eigenständige PWA.
- `assets/beispielgerichte-original.png`: KI-generierte 2×2-Bildtafel, 1254 × 1254 px.
- `assets/beispielgerichte.webp`: dieselbe Tafel bei unveränderten Abmessungen als komprimierte WebP-Arbeitskopie. Die Vorschau zeigt die vier Gerichte über CSS-Bildausschnitte; das eingebettete Bild hält sie unter 1 MB.
- `sammlung-ipad.png`, `kochen-iphone.png`, `abschluss-ipad.png`: tatsächliche Browseraufnahmen des Entwurfs vor der Namensentscheidung. Sie dokumentieren das Layout; die aktuelle Wortmarke „Digitales Rezeptbuch“ steht in der interaktiven Quelle. Dateinamen beschreiben die Layoutansicht; keine Aufnahmen von echten Apple-Geräten.
- `navigation-pruefung.json`: gemessene Schaltflächenpositionen für sämtliche acht Kochansichten bei zwei Browserbreiten.

## Generierung

Werkzeug: integriertes ImageGen, neuer Bildauftrag, kein Referenzbild, undurchsichtiger Hintergrund. Das generierte Original wurde unverändert kopiert; die WebP-Fassung wurde ausschließlich für die Dateigröße neu kodiert. Kleine Garnituren im Bild sind illustrative Gestaltung, keine Rezeptinformation.

Vollständiger verwendeter Prompt:

> Use case: photorealistic-natural. Create one square editorial food photograph contact sheet, a precise edge-to-edge 2 by 2 grid of four equally sized square photographs, no gutters, no text, no logos. This is an illustrative asset for a premium German recipe app design prototype, not a photo of a user's actual dish. Upper left: rich silky roasted orange pumpkin soup in a matte ivory ceramic bowl, subtle cream swirl and a few pumpkin seeds, dramatic but natural side light, close three-quarter overhead view. Upper right: glossy rigatoni with tomato sauce and a few basil leaves in a matte ivory shallow bowl. Lower left: beautifully browned chicken breast, fluffy rice and roasted carrots on a matte ivory plate. Lower right: rustic apple crumble in a small ceramic baking dish, golden toasted crumbs, clearly visible apple pieces. Consistent dark slate navy tabletop, understated natural food magazine styling, tactile ceramics, appetizing realistic textures, soft directional daylight, beautiful warm food against dark cool background, each dish centered and fully contained in its own quadrant with a modest dark margin. No cutlery crossing quadrants, no hands, no UI, no typography. Square overall composition.
