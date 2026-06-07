export type DesignLanguage = "cyberpunk" | "delight";

export const DESIGN_LANGUAGE_STORAGE_KEY = "budget-planner-design-language";
export const DEFAULT_DESIGN_LANGUAGE: DesignLanguage = "delight";

const VALID_DESIGN_LANGUAGES: DesignLanguage[] = ["cyberpunk", "delight"];

// Income keeps a dedicated accent (it is not one of the spending categories).
const INCOME_COLOR_BY_LANGUAGE: Record<DesignLanguage, string> = {
  cyberpunk: "#8b5cf6",
  delight: "#8a63d2",
};

const UNASSIGNED_COLOR_BY_LANGUAGE: Record<DesignLanguage, string> = {
  cyberpunk: "#94a3b8",
  delight: "#9aa3ae",
};

// Ordered palette used to color dynamic categories by position. The first
// three entries intentionally match the legacy Needs / Wants / Savings colors
// so existing budgets look unchanged after the migration.
const CATEGORY_PALETTE_BY_LANGUAGE: Record<DesignLanguage, string[]> = {
  cyberpunk: [
    "#ef4444", // Needs (red)
    "#3b82f6", // Wants (blue)
    "#22c55e", // Savings (green)
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#eab308", // Yellow
  ],
  delight: [
    "#e06c5f", // Needs (coral)
    "#4f7fdc", // Wants (azure)
    "#2f9f76", // Savings (emerald)
    "#d49a41", // Amber
    "#8a63d2", // Violet
    "#cc5f9a", // Magenta
    "#2d9bb2", // Teal
    "#7ea13a", // Olive
    "#d47052", // Terracotta
    "#5c76c6", // Indigo
    "#2f998f", // Sea green
    "#9b5fc9", // Purple
  ],
};

export const CATEGORY_PALETTE_LENGTH =
  CATEGORY_PALETTE_BY_LANGUAGE.cyberpunk.length;

export function isDesignLanguage(value: unknown): value is DesignLanguage {
  return VALID_DESIGN_LANGUAGES.includes(value as DesignLanguage);
}

export function normalizeDesignLanguage(value: unknown): DesignLanguage {
  if (isDesignLanguage(value)) {
    return value;
  }

  return DEFAULT_DESIGN_LANGUAGE;
}

export function getIncomeColor(designLanguage: DesignLanguage): string {
  return INCOME_COLOR_BY_LANGUAGE[designLanguage];
}

export function getUnassignedColor(designLanguage: DesignLanguage): string {
  return UNASSIGNED_COLOR_BY_LANGUAGE[designLanguage];
}

export function getCategoryPalette(designLanguage: DesignLanguage): string[] {
  return CATEGORY_PALETTE_BY_LANGUAGE[designLanguage];
}

/** Deterministic category color by ordered position. */
export function getCategoryColorByIndex(
  index: number,
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): string {
  const palette = CATEGORY_PALETTE_BY_LANGUAGE[designLanguage];
  return palette[((index % palette.length) + palette.length) % palette.length];
}

/**
 * Resolve a category's display color. We prefer the live design-language
 * palette (so theme switches restyle every category), falling back to the
 * stored colorToken for custom hues that fall outside the palette.
 */
export function resolveCategoryColor(
  colorToken: string,
  sortIndex: number,
  designLanguage: DesignLanguage,
): string {
  const palette = CATEGORY_PALETTE_BY_LANGUAGE[designLanguage];
  // If the stored token is part of any known palette, treat it as a themed
  // slot and remap to the current language by position for consistency.
  const isKnownToken = Object.values(CATEGORY_PALETTE_BY_LANGUAGE).some(
    (colors) => colors.includes(colorToken),
  );
  if (isKnownToken) {
    return palette[((sortIndex % palette.length) + palette.length) % palette.length];
  }
  return colorToken;
}

/** A longer palette for coloring individual line items within a breakdown. */
export function getItemizedPalette(designLanguage: DesignLanguage): string[] {
  return CATEGORY_PALETTE_BY_LANGUAGE[designLanguage];
}
