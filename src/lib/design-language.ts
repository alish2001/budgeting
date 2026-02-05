import { CategoryName, SpendingCategoryName } from "@/types/budget";

export type DesignLanguage = "cyberpunk" | "delight";

export const DESIGN_LANGUAGE_STORAGE_KEY = "budget-planner-design-language";
export const DEFAULT_DESIGN_LANGUAGE: DesignLanguage = "delight";

const VALID_DESIGN_LANGUAGES: DesignLanguage[] = ["cyberpunk", "delight"];

const CATEGORY_COLORS_BY_LANGUAGE: Record<DesignLanguage, Record<CategoryName, string>> = {
  cyberpunk: {
    needs: "#ef4444",
    wants: "#3b82f6",
    savings: "#22c55e",
    income: "#8b5cf6",
  },
  delight: {
    needs: "#c8887f",
    wants: "#7f9fc8",
    savings: "#79ae90",
    income: "#a893c9",
  },
};

const ITEMIZED_CATEGORY_PALETTES_BY_LANGUAGE: Record<
  DesignLanguage,
  Record<SpendingCategoryName, string[]>
> = {
  cyberpunk: {
    needs: ["#ef4444", "#f97316", "#fb7185", "#f43f5e", "#dc2626"],
    wants: ["#3b82f6", "#0ea5e9", "#06b6d4", "#2563eb", "#38bdf8"],
    savings: ["#22c55e", "#10b981", "#84cc16", "#16a34a", "#65a30d"],
  },
  delight: {
    needs: ["#c8887f", "#d29790", "#bc7f79", "#d6a6a0", "#ad756f"],
    wants: ["#7f9fc8", "#90add2", "#7698c2", "#9fb9dc", "#6f91ba"],
    savings: ["#79ae90", "#8abca0", "#6fa684", "#9ac8ae", "#659c7b"],
  },
};

export function isDesignLanguage(value: unknown): value is DesignLanguage {
  return VALID_DESIGN_LANGUAGES.includes(value as DesignLanguage);
}

export function normalizeDesignLanguage(value: unknown): DesignLanguage {
  if (isDesignLanguage(value)) {
    return value;
  }

  return DEFAULT_DESIGN_LANGUAGE;
}

export function getCategoryColor(
  category: CategoryName,
  designLanguage: DesignLanguage
): string {
  return CATEGORY_COLORS_BY_LANGUAGE[designLanguage][category];
}

export function getItemizedCategoryPalette(
  category: SpendingCategoryName,
  designLanguage: DesignLanguage
): string[] {
  return ITEMIZED_CATEGORY_PALETTES_BY_LANGUAGE[designLanguage][category];
}
