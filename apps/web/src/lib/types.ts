export type Ingredient = {
  id: string;
  name: string;
  amountText: string;
  quantity: number | null;
  unit: string | null;
  group: string;
};

export type Equipment = {
  name: string;
  origin: "source" | "suggestion";
};

export type RecipeStep = {
  title: string;
  instruction: string;
  relatedIngredients: string[];
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  estimatedMinutes: number | null;
  servings: number | null;
  imagePosition?: "tl" | "tr" | "bl" | "br";
  ingredients: Ingredient[];
  equipment: Equipment[];
  steps: RecipeStep[];
  sourceText: string;
  sourceNotes?: string[];
  demo: boolean;
};

export type PlanSlot = { recipeId: string; servings: number } | null;
export type ShoppingItem = {
  key: string;
  name: string;
  group: string;
  required: number | null;
  unit: string | null;
  amountText: string;
  days: number[];
};
