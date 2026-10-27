import type { Ingredient, Recipe } from "./types";

const ingredient = (id: string, name: string, quantity: number, unit: string, group: string): Ingredient => ({
  id, name, quantity, unit, group, amountText: `${quantity} ${unit}`,
});

export const recipes: Recipe[] = [
  {
    id: "kuerbissuppe", title: "Kürbiscremesuppe", description: "Ein künstliches Beispiel für eine herbstliche Suppe.",
    tags: ["Gemüse", "Suppe"], estimatedMinutes: 35, servings: 4, imagePosition: "tl", demo: true,
    ingredients: [
      ingredient("pumpkin", "Hokkaidokürbis", 800, "g", "Gemüse & Obst"),
      ingredient("onion", "Zwiebel", 1, "Stück", "Gemüse & Obst"),
      ingredient("stock", "Gemüsebrühe", 750, "ml", "Vorrat & Gewürze"),
      ingredient("cream", "Schlagobers", 100, "ml", "Kühlregal"),
      ingredient("oil", "Öl", 1, "EL", "Vorrat & Gewürze"),
    ],
    equipment: [{ name: "Topf", origin: "source" }, { name: "Pürierstab", origin: "source" }, { name: "Messer und Schneidebrett", origin: "suggestion" }],
    steps: [
      { title: "Gemüse vorbereiten", instruction: "Den Kürbis entkernen und würfeln. Die Zwiebel schälen und fein schneiden.", relatedIngredients: ["800 g Hokkaidokürbis", "1 Zwiebel"] },
      { title: "Zwiebel anschwitzen", instruction: "Das Öl in einem Topf erhitzen und die Zwiebel darin glasig anschwitzen.", relatedIngredients: ["1 EL Öl", "Vorbereitete Zwiebel"] },
      { title: "Kürbis garen", instruction: "Den Kürbis und die Gemüsebrühe dazugeben. Bei kleiner Hitze etwa 20 Minuten köcheln lassen, bis der Kürbis weich ist.", relatedIngredients: ["Vorbereiteter Kürbis", "750 ml Gemüsebrühe"] },
      { title: "Suppe pürieren", instruction: "Mit dem Pürierstab fein pürieren. Das Schlagobers einrühren.", relatedIngredients: ["100 ml Schlagobers"] },
    ],
    sourceText: "Kürbiscremesuppe · 4 Portionen\n800 g Hokkaidokürbis, 1 Zwiebel, 750 ml Gemüsebrühe, 100 ml Schlagobers, 1 EL Öl\n\nDen Kürbis entkernen und würfeln. Die Zwiebel schälen und fein schneiden. Das Öl in einem Topf erhitzen und die Zwiebel darin glasig anschwitzen. Kürbis und Brühe zugeben und bei kleiner Hitze etwa 20 Minuten köcheln lassen. Fein pürieren und Schlagobers einrühren.",
  },
  {
    id: "rigatoni", title: "Rigatoni mit Tomatensauce", description: "Ein künstliches Beispiel für ein einfaches Pastagericht.",
    tags: ["Gemüse"], estimatedMinutes: 25, servings: 2, imagePosition: "tr", demo: true,
    ingredients: [ingredient("pasta", "Rigatoni", 200, "g", "Vorrat & Gewürze"), ingredient("tomato", "Passierte Tomaten", 400, "g", "Vorrat & Gewürze"), ingredient("onion", "Zwiebel", 1, "Stück", "Gemüse & Obst"), ingredient("oil", "Öl", 1, "EL", "Vorrat & Gewürze")],
    equipment: [{ name: "Topf", origin: "source" }, { name: "Pfanne", origin: "source" }, { name: "Sieb", origin: "suggestion" }],
    steps: [
      { title: "Pasta kochen", instruction: "Die Rigatoni nach Packungsangabe in einem Topf kochen.", relatedIngredients: ["200 g Rigatoni"] },
      { title: "Sauce zubereiten", instruction: "Die Zwiebel schneiden und mit dem Öl in einer Pfanne anschwitzen. Die passierten Tomaten dazugeben und 10 Minuten köcheln lassen.", relatedIngredients: ["1 Zwiebel", "1 EL Öl", "400 g passierte Tomaten"] },
      { title: "Pasta vermengen", instruction: "Die Rigatoni abgießen und mit der Sauce vermengen.", relatedIngredients: [] },
    ],
    sourceText: "Rigatoni mit Tomatensauce · 2 Portionen\n200 g Rigatoni, 400 g passierte Tomaten, 1 Zwiebel, 1 EL Öl\n\nRigatoni nach Packungsangabe kochen. Zwiebel in Öl anschwitzen. Tomaten dazugeben, 10 Minuten köcheln lassen. Pasta abgießen und mit der Sauce vermengen.",
  },
  {
    id: "hendl", title: "Hendl mit Reis & Karotten", description: "Ein künstliches Beispiel mit Fleisch und Gemüse.",
    tags: ["Fleisch", "Gemüse"], estimatedMinutes: 40, servings: 2, imagePosition: "bl", demo: true,
    ingredients: [ingredient("chicken", "Hendlbrust", 300, "g", "Fleisch & Fisch"), ingredient("rice", "Reis", 150, "g", "Vorrat & Gewürze"), ingredient("carrot", "Karotten", 300, "g", "Gemüse & Obst"), ingredient("oil", "Öl", 1, "EL", "Vorrat & Gewürze")],
    equipment: [{ name: "Topf", origin: "source" }, { name: "Pfanne", origin: "source" }, { name: "Messer und Schneidebrett", origin: "suggestion" }],
    steps: [
      { title: "Reis kochen", instruction: "Den Reis nach Packungsangabe in einem Topf kochen.", relatedIngredients: ["150 g Reis"] },
      { title: "Karotten schneiden", instruction: "Die Karotten schälen und in Scheiben schneiden.", relatedIngredients: ["300 g Karotten"] },
      { title: "Hendl und Karotten braten", instruction: "Das Öl in einer Pfanne erhitzen. Hendl und Karotten darin braten, bis das Hendl vollständig durchgegart ist.", relatedIngredients: ["300 g Hendlbrust", "Vorbereitete Karotten", "1 EL Öl"] },
      { title: "Anrichten", instruction: "Das Hendl und die Karotten mit dem Reis anrichten.", relatedIngredients: [] },
    ],
    sourceText: "Hendl mit Reis & Karotten · 2 Portionen\n300 g Hendlbrust, 150 g Reis, 300 g Karotten, 1 EL Öl\n\nReis kochen. Karotten schälen und in Scheiben schneiden. Hendl und Karotten in Öl braten, bis das Hendl vollständig durchgegart ist. Mit Reis anrichten.",
  },
  {
    id: "apfelcrumble", title: "Apfelcrumble", description: "Ein künstliches Dessertbeispiel.",
    tags: ["Dessert"], estimatedMinutes: 50, servings: 4, imagePosition: "br", demo: true,
    ingredients: [ingredient("apple", "Äpfel", 600, "g", "Gemüse & Obst"), ingredient("flour", "Mehl", 120, "g", "Vorrat & Gewürze"), ingredient("butter", "Butter", 80, "g", "Kühlregal"), ingredient("sugar", "Zucker", 60, "g", "Vorrat & Gewürze")],
    equipment: [{ name: "Auflaufform", origin: "source" }, { name: "Schüssel", origin: "suggestion" }, { name: "Messer und Schneidebrett", origin: "suggestion" }],
    steps: [
      { title: "Äpfel vorbereiten", instruction: "Die Äpfel schälen, entkernen und in Stücke schneiden. In eine Auflaufform geben.", relatedIngredients: ["600 g Äpfel"] },
      { title: "Streusel herstellen", instruction: "Mehl, Butter und Zucker zu Streuseln verkneten.", relatedIngredients: ["120 g Mehl", "80 g Butter", "60 g Zucker"] },
      { title: "Crumble backen", instruction: "Die Streusel auf den Äpfeln verteilen. Bei 180 °C Ober-/Unterhitze etwa 30 Minuten backen.", relatedIngredients: [] },
    ],
    sourceText: "Apfelcrumble · 4 Portionen\n600 g Äpfel, 120 g Mehl, 80 g Butter, 60 g Zucker\n\nÄpfel vorbereiten und in die Auflaufform geben. Streusel aus Mehl, Butter und Zucker herstellen. Bei 180 °C Ober-/Unterhitze etwa 30 Minuten backen.",
  },
];

export const weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] as const;
