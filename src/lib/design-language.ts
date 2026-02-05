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
    needs: "#e06c5f",
    wants: "#4f7fdc",
    savings: "#2f9f76",
    income: "#8a63d2",
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
    needs: ["#e06c5f", "#d9574a", "#eb7b69", "#c94b3f", "#f28e79"],
    wants: ["#4f7fdc", "#3f6ecf", "#5f8de6", "#355fb8", "#6d9aec"],
    savings: ["#2f9f76", "#248d68", "#3ab688", "#1f7c5a", "#4cc696"],
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
