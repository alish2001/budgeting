import {
  BudgetCategory,
  BudgetLineItem,
  BudgetPlan,
  CATEGORY_CONFIG,
  IncomeItem,
  SerializedBudget,
  SerializedBudgetV3,
  SerializedCategoryV3,
} from "@/types/budget";
import {
  CATEGORY_PALETTE_LENGTH,
  getCategoryColorByIndex,
  DEFAULT_DESIGN_LANGUAGE,
  type DesignLanguage,
} from "@/lib/design-language";

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

interface DefaultCategorySeed {
  name: string;
  targetPercentage: number;
}

export const DEFAULT_CATEGORY_SEEDS: DefaultCategorySeed[] = [
  { name: CATEGORY_CONFIG.needs.label, targetPercentage: CATEGORY_CONFIG.needs.targetPercentage },
  { name: CATEGORY_CONFIG.wants.label, targetPercentage: CATEGORY_CONFIG.wants.targetPercentage },
  { name: CATEGORY_CONFIG.savings.label, targetPercentage: CATEGORY_CONFIG.savings.targetPercentage },
];

export function colorTokenForIndex(
  index: number,
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): string {
  return getCategoryColorByIndex(index, designLanguage);
}

export function createDefaultCategories(
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): BudgetCategory[] {
  const now = new Date().toISOString();
  return DEFAULT_CATEGORY_SEEDS.map((seed, index) => ({
    id: createId(),
    name: seed.name,
    targetPercentage: seed.targetPercentage,
    colorToken: colorTokenForIndex(index, designLanguage),
    sortOrder: index,
    parentCategoryId: null,
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export function createDefaultPlan(
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): BudgetPlan {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name: undefined,
    schemaVersion: 3,
    incomeItems: [],
    categories: createDefaultCategories(designLanguage),
    budgetItems: [],
    settings: { unassignedBehavior: "keep" },
    selectedCategoryId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Build a fresh category object for a brand-new user-created category. */
export function createCategory(
  plan: BudgetPlan,
  name: string,
  options: { targetPercentage?: number; designLanguage?: DesignLanguage } = {},
): BudgetCategory {
  const now = new Date().toISOString();
  const sortOrder = nextCategorySortOrder(plan);
  const colorIndex = sortOrder % CATEGORY_PALETTE_LENGTH;
  return {
    id: createId(),
    name: name.trim() || "New Category",
    targetPercentage: options.targetPercentage ?? 0,
    colorToken: colorTokenForIndex(colorIndex, options.designLanguage),
    sortOrder,
    parentCategoryId: null,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function getSortedCategories(plan: BudgetPlan): BudgetCategory[] {
  return [...plan.categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategoryById(
  plan: BudgetPlan,
  categoryId: string,
): BudgetCategory | null {
  return plan.categories.find((category) => category.id === categoryId) ?? null;
}

export function getItemsForCategory(
  plan: BudgetPlan,
  categoryId: string | null,
): BudgetLineItem[] {
  return plan.budgetItems
    .filter((item) => item.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getUnassignedItems(plan: BudgetPlan): BudgetLineItem[] {
  return getItemsForCategory(plan, null);
}

export function getSortedIncomeItems(plan: BudgetPlan): IncomeItem[] {
  return [...plan.incomeItems].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getTotalForCategory(
  plan: BudgetPlan,
  categoryId: string | null,
): number {
  return plan.budgetItems
    .filter((item) => item.categoryId === categoryId)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function getTotalBudgeted(plan: BudgetPlan): number {
  return plan.budgetItems.reduce((sum, item) => sum + item.amount, 0);
}

export function getTotalIncome(plan: BudgetPlan): number {
  return plan.incomeItems.reduce((sum, item) => sum + item.amount, 0);
}

export function getUnbudgetedAmount(plan: BudgetPlan): number {
  return getTotalIncome(plan) - getTotalBudgeted(plan);
}

export function getTargetTotal(plan: BudgetPlan): number {
  return plan.categories.reduce(
    (sum, category) => sum + category.targetPercentage,
    0,
  );
}

export function hasPlanData(plan: BudgetPlan): boolean {
  return plan.incomeItems.length > 0 || plan.budgetItems.length > 0;
}

export function nextCategorySortOrder(plan: BudgetPlan): number {
  return plan.categories.reduce(
    (max, category) => Math.max(max, category.sortOrder + 1),
    0,
  );
}

export function nextItemSortOrder(
  plan: BudgetPlan,
  categoryId: string | null,
): number {
  return plan.budgetItems
    .filter((item) => item.categoryId === categoryId)
    .reduce((max, item) => Math.max(max, item.sortOrder + 1), 0);
}

export function nextIncomeSortOrder(plan: BudgetPlan): number {
  return plan.incomeItems.reduce(
    (max, item) => Math.max(max, item.sortOrder + 1),
    0,
  );
}

// ---------------------------------------------------------------------------
// Serialization (v3)
// ---------------------------------------------------------------------------

export function serializePlan(plan: BudgetPlan): SerializedBudgetV3 {
  const categories: SerializedCategoryV3[] = getSortedCategories(plan).map(
    (category) => ({
      name: category.name,
      targetPercentage: category.targetPercentage,
      items: getItemsForCategory(plan, category.id).map((item) => ({
        label: item.label,
        amount: item.amount,
      })),
    }),
  );

  const unassigned = getUnassignedItems(plan).map((item) => ({
    label: item.label,
    amount: item.amount,
  }));

  const serialized: SerializedBudgetV3 = {
    version: 3,
    income: getSortedIncomeItems(plan).map((item) => ({
      label: item.label,
      amount: item.amount,
    })),
    categories,
  };

  if (plan.name && plan.name.trim()) {
    serialized.name = plan.name.trim();
  }
  if (unassigned.length > 0) {
    serialized.unassigned = unassigned;
  }

  return serialized;
}

/** Build a plan from a v3 serialized payload (assigns fresh IDs). */
export function planFromSerializedV3(
  data: SerializedBudgetV3,
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): BudgetPlan {
  const now = new Date().toISOString();

  const categories: BudgetCategory[] = data.categories.map((category, index) => ({
    id: createId(),
    name: category.name,
    targetPercentage: category.targetPercentage,
    colorToken: colorTokenForIndex(index % CATEGORY_PALETTE_LENGTH, designLanguage),
    sortOrder: index,
    parentCategoryId: null,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  }));

  const budgetItems: BudgetLineItem[] = [];
  data.categories.forEach((category, categoryIndex) => {
    const categoryId = categories[categoryIndex].id;
    category.items.forEach((item, itemIndex) => {
      budgetItems.push({
        id: createId(),
        label: item.label,
        amount: item.amount,
        categoryId,
        sortOrder: itemIndex,
        createdAt: now,
        updatedAt: now,
      });
    });
  });

  (data.unassigned ?? []).forEach((item, itemIndex) => {
    budgetItems.push({
      id: createId(),
      label: item.label,
      amount: item.amount,
      categoryId: null,
      sortOrder: itemIndex,
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    id: createId(),
    name: data.name?.trim() || undefined,
    schemaVersion: 3,
    incomeItems: data.income.map((item, index) => ({
      id: createId(),
      label: item.label,
      amount: item.amount,
      sortOrder: index,
    })),
    categories,
    budgetItems,
    settings: { unassignedBehavior: "keep" },
    selectedCategoryId: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Migration from legacy v2 shapes
// ---------------------------------------------------------------------------

/** Convert a legacy v2 serialized share payload to v3. */
export function serializedV2ToV3(data: SerializedBudget): SerializedBudgetV3 {
  const targets = data.targets ?? {
    needs: CATEGORY_CONFIG.needs.targetPercentage,
    wants: CATEGORY_CONFIG.wants.targetPercentage,
    savings: CATEGORY_CONFIG.savings.targetPercentage,
  };

  const categories: SerializedCategoryV3[] = [
    {
      name: CATEGORY_CONFIG.needs.label,
      targetPercentage: targets.needs,
      items: data.items.needs ?? [],
    },
    {
      name: CATEGORY_CONFIG.wants.label,
      targetPercentage: targets.wants,
      items: data.items.wants ?? [],
    },
    {
      name: CATEGORY_CONFIG.savings.label,
      targetPercentage: targets.savings,
      items: data.items.savings ?? [],
    },
  ];

  return {
    version: 3,
    income: data.items.income ?? [],
    categories,
  };
}

// ---------------------------------------------------------------------------
// Preview (for import dialogs)
// ---------------------------------------------------------------------------

export interface BudgetPreview {
  totalIncome: number;
  totalBudgeted: number;
  itemCount: number;
  categoryCount: number;
  categories: { name: string; total: number; itemCount: number }[];
}

export function getSerializedPreview(data: SerializedBudgetV3): BudgetPreview {
  const sum = (items: { amount: number }[]) =>
    items.reduce((acc, item) => acc + item.amount, 0);

  const categories = data.categories.map((category) => ({
    name: category.name,
    total: sum(category.items),
    itemCount: category.items.length,
  }));

  const unassignedCount = data.unassigned?.length ?? 0;
  const totalBudgeted =
    categories.reduce((acc, category) => acc + category.total, 0) +
    sum(data.unassigned ?? []);
  const itemCount =
    categories.reduce((acc, category) => acc + category.itemCount, 0) +
    unassignedCount;

  return {
    totalIncome: sum(data.income),
    totalBudgeted,
    itemCount: itemCount + data.income.length,
    categoryCount: categories.length,
    categories,
  };
}
