import {
  AnySerializedBudget,
  BudgetCategory,
  BudgetCategoryId,
  BudgetLineItem,
  BudgetPlan,
  CATEGORY_CONFIG,
  IncomeItem,
  SerializedBudget,
  SerializedBudgetV3,
  SerializedBudgetV4,
  SerializedCategoryV3,
  SerializedCategoryV4,
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
  options: {
    targetPercentage?: number;
    designLanguage?: DesignLanguage;
    parentCategoryId?: BudgetCategoryId | null;
  } = {},
): BudgetCategory {
  const now = new Date().toISOString();
  const parentCategoryId = options.parentCategoryId ?? null;
  // sortOrder is sibling-scoped, so it can't seed the color anymore; use the
  // total category count to keep colors distinct across the whole tree.
  const colorIndex = plan.categories.length % CATEGORY_PALETTE_LENGTH;
  return {
    id: createId(),
    name: name.trim() || "New Category",
    targetPercentage: options.targetPercentage ?? 0,
    colorToken: colorTokenForIndex(colorIndex, options.designLanguage),
    sortOrder: nextCategorySortOrder(plan, parentCategoryId),
    parentCategoryId,
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

// Because a category's effective target is its own targetPercentage plus all
// descendants', summing every category's own targetPercentage equals the sum
// of top-level effective targets — so this plan-wide total (and the 100%
// check built on it) needs no hierarchy awareness.
export function getTargetTotal(plan: BudgetPlan): number {
  return plan.categories.reduce(
    (sum, category) => sum + category.targetPercentage,
    0,
  );
}

export function hasPlanData(plan: BudgetPlan): boolean {
  return plan.incomeItems.length > 0 || plan.budgetItems.length > 0;
}

/** sortOrder is scoped per sibling group (categories sharing a parent). */
export function nextCategorySortOrder(
  plan: BudgetPlan,
  parentCategoryId: BudgetCategoryId | null = null,
): number {
  return plan.categories
    .filter((category) => (category.parentCategoryId ?? null) === parentCategoryId)
    .reduce((max, category) => Math.max(max, category.sortOrder + 1), 0);
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
// Hierarchy (subcategories)
//
// Categories form a tree via parentCategoryId (flat adjacency list). The
// structural helpers below take a plain BudgetCategory[] so future features
// (e.g. analysis over arbitrary category unions) can reuse them outside a
// full plan.
// ---------------------------------------------------------------------------

function parentOf(category: BudgetCategory): BudgetCategoryId | null {
  return category.parentCategoryId ?? null;
}

function buildChildrenByParent(
  categories: BudgetCategory[],
): Map<BudgetCategoryId | null, BudgetCategory[]> {
  const byParent = new Map<BudgetCategoryId | null, BudgetCategory[]>();
  for (const category of categories) {
    const key = parentOf(category);
    const siblings = byParent.get(key);
    if (siblings) siblings.push(category);
    else byParent.set(key, [category]);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return byParent;
}

export function getChildCategories(
  plan: BudgetPlan,
  parentId: BudgetCategoryId | null,
): BudgetCategory[] {
  return plan.categories
    .filter((category) => parentOf(category) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getTopLevelCategories(plan: BudgetPlan): BudgetCategory[] {
  return getChildCategories(plan, null);
}

/** All categories below categoryId (excluding it), in BFS order. */
export function getDescendantCategoryIds(
  categories: BudgetCategory[],
  categoryId: BudgetCategoryId,
): BudgetCategoryId[] {
  const byParent = buildChildrenByParent(categories);
  const result: BudgetCategoryId[] = [];
  const queue: BudgetCategoryId[] = [categoryId];
  const seen = new Set<BudgetCategoryId>([categoryId]);
  while (queue.length > 0) {
    const current = queue.shift() as BudgetCategoryId;
    for (const child of byParent.get(current) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      result.push(child.id);
      queue.push(child.id);
    }
  }
  return result;
}

/** categoryId plus all of its descendants. */
export function getSubtreeCategoryIds(
  categories: BudgetCategory[],
  categoryId: BudgetCategoryId,
): BudgetCategoryId[] {
  return [categoryId, ...getDescendantCategoryIds(categories, categoryId)];
}

export function isDescendantOf(
  categories: BudgetCategory[],
  candidateId: BudgetCategoryId,
  ancestorId: BudgetCategoryId,
): boolean {
  return getDescendantCategoryIds(categories, ancestorId).includes(candidateId);
}

/** Would re-parenting categoryId under newParentId create a cycle? */
export function wouldCreateCycle(
  categories: BudgetCategory[],
  categoryId: BudgetCategoryId,
  newParentId: BudgetCategoryId | null,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === categoryId) return true;
  return isDescendantOf(categories, newParentId, categoryId);
}

/** Union total: the category's own items plus every descendant's items. */
export function getSubtreeItemTotal(
  plan: BudgetPlan,
  categoryId: BudgetCategoryId,
): number {
  const subtree = new Set(getSubtreeCategoryIds(plan.categories, categoryId));
  return plan.budgetItems
    .filter((item) => item.categoryId !== null && subtree.has(item.categoryId))
    .reduce((sum, item) => sum + item.amount, 0);
}

/** Effective target: own targetPercentage plus every descendant's. */
export function getEffectiveTarget(
  plan: BudgetPlan,
  categoryId: BudgetCategoryId,
): number {
  const subtree = new Set(getSubtreeCategoryIds(plan.categories, categoryId));
  return plan.categories
    .filter((category) => subtree.has(category.id))
    .reduce((sum, category) => sum + category.targetPercentage, 0);
}

/** Sum of the direct children's effective targets. */
export function getChildTargetTotal(
  plan: BudgetPlan,
  categoryId: BudgetCategoryId,
): number {
  return getChildCategories(plan, categoryId).reduce(
    (sum, child) => sum + getEffectiveTarget(plan, child.id),
    0,
  );
}

/**
 * Soft warning: children's targets exceed the parent's own explicit target.
 * An own target of 0 means "the target lives entirely in the children" and is
 * not a warning state.
 */
export function hasChildTargetOverflow(
  plan: BudgetPlan,
  categoryId: BudgetCategoryId,
): boolean {
  const category = getCategoryById(plan, categoryId);
  if (!category || category.targetPercentage <= 0) return false;
  return getChildTargetTotal(plan, categoryId) > category.targetPercentage;
}

/** Ancestors root-first, ending with the category itself. */
export function getCategoryPath(
  plan: BudgetPlan,
  categoryId: BudgetCategoryId,
): BudgetCategory[] {
  const byId = new Map(plan.categories.map((category) => [category.id, category]));
  const path: BudgetCategory[] = [];
  const seen = new Set<BudgetCategoryId>();
  let current = byId.get(categoryId) ?? null;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    const parentId = parentOf(current);
    current = parentId ? byId.get(parentId) ?? null : null;
  }
  return path;
}

export function getCategoryPathLabel(
  plan: BudgetPlan,
  categoryId: BudgetCategoryId,
  separator = " › ",
): string {
  return getCategoryPath(plan, categoryId)
    .map((category) => category.name)
    .join(separator);
}

/** Depth-first pre-order — the canonical "list all categories" enumeration. */
export function getCategoriesInTreeOrder(
  plan: BudgetPlan,
): { category: BudgetCategory; depth: number }[] {
  const byParent = buildChildrenByParent(plan.categories);
  const result: { category: BudgetCategory; depth: number }[] = [];
  const visited = new Set<BudgetCategoryId>();
  const visit = (parentId: BudgetCategoryId | null, depth: number) => {
    for (const category of byParent.get(parentId) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      result.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  return result;
}

/** Re-number every sibling group's sortOrder to a dense 0..n-1. */
export function reindexSiblingGroups(
  categories: BudgetCategory[],
): BudgetCategory[] {
  const orderById = new Map<BudgetCategoryId, number>();
  for (const siblings of buildChildrenByParent(categories).values()) {
    siblings.forEach((category, index) => orderById.set(category.id, index));
  }
  return categories.map((category) => {
    const sortOrder = orderById.get(category.id);
    return sortOrder === undefined || sortOrder === category.sortOrder
      ? category
      : { ...category, sortOrder };
  });
}

/** Re-attach categoryId's direct children to its parent (delete-promote). */
export function promoteChildrenOf(
  categories: BudgetCategory[],
  categoryId: BudgetCategoryId,
): BudgetCategory[] {
  const target = categories.find((category) => category.id === categoryId);
  if (!target) return categories;
  const newParentId = parentOf(target);
  // Append promoted children after the existing siblings of that group.
  let nextOrder = categories
    .filter(
      (category) =>
        parentOf(category) === newParentId && category.id !== categoryId,
    )
    .reduce((max, category) => Math.max(max, category.sortOrder + 1), 0);
  return categories.map((category) => {
    if (parentOf(category) !== categoryId) return category;
    return { ...category, parentCategoryId: newParentId, sortOrder: nextOrder++ };
  });
}

/**
 * Repair an untrusted category list: orphaned parent references become
 * top-level, parent chains that loop are broken at the offending node, and
 * every sibling group is reindexed.
 */
export function repairCategoryTree(
  categories: BudgetCategory[],
): BudgetCategory[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const repaired = categories.map((category) => {
    const parentId = parentOf(category);
    if (parentId === null) return category;
    if (parentId === category.id || !byId.has(parentId)) {
      return { ...category, parentCategoryId: null };
    }
    return category;
  });

  const repairedById = new Map(repaired.map((category) => [category.id, category]));
  const result = repaired.map((category) => {
    const seen = new Set<BudgetCategoryId>([category.id]);
    let current = repairedById.get(parentOf(category) ?? "");
    while (current) {
      if (seen.has(current.id)) {
        // Walking up from this category revisits a node: break the cycle here.
        return { ...category, parentCategoryId: null };
      }
      seen.add(current.id);
      current = repairedById.get(parentOf(current) ?? "");
    }
    return category;
  });

  return reindexSiblingGroups(result);
}

// ---------------------------------------------------------------------------
// Serialization (v4, nested children)
// ---------------------------------------------------------------------------

export function serializePlan(plan: BudgetPlan): SerializedBudgetV4 {
  const serializeCategory = (category: BudgetCategory): SerializedCategoryV4 => {
    const children = getChildCategories(plan, category.id).map(serializeCategory);
    const serialized: SerializedCategoryV4 = {
      name: category.name,
      targetPercentage: category.targetPercentage,
      items: getItemsForCategory(plan, category.id).map((item) => ({
        label: item.label,
        amount: item.amount,
      })),
    };
    if (children.length > 0) {
      serialized.children = children;
    }
    return serialized;
  };

  const unassigned = getUnassignedItems(plan).map((item) => ({
    label: item.label,
    amount: item.amount,
  }));

  const serialized: SerializedBudgetV4 = {
    version: 4,
    income: getSortedIncomeItems(plan).map((item) => ({
      label: item.label,
      amount: item.amount,
    })),
    categories: getTopLevelCategories(plan).map(serializeCategory),
  };

  if (plan.name && plan.name.trim()) {
    serialized.name = plan.name.trim();
  }
  if (unassigned.length > 0) {
    serialized.unassigned = unassigned;
  }

  return serialized;
}

/** Build a plan from a v4 serialized payload (assigns fresh IDs). */
export function planFromSerializedV4(
  data: SerializedBudgetV4,
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): BudgetPlan {
  const now = new Date().toISOString();
  const categories: BudgetCategory[] = [];
  const budgetItems: BudgetLineItem[] = [];

  const addCategoryNode = (
    node: SerializedCategoryV4,
    parentCategoryId: BudgetCategoryId | null,
    siblingIndex: number,
  ) => {
    const id = createId();
    categories.push({
      id,
      name: node.name,
      targetPercentage: node.targetPercentage,
      colorToken: colorTokenForIndex(
        categories.length % CATEGORY_PALETTE_LENGTH,
        designLanguage,
      ),
      sortOrder: siblingIndex,
      parentCategoryId,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    });
    node.items.forEach((item, itemIndex) => {
      budgetItems.push({
        id: createId(),
        label: item.label,
        amount: item.amount,
        categoryId: id,
        sortOrder: itemIndex,
        createdAt: now,
        updatedAt: now,
      });
    });
    (node.children ?? []).forEach((child, childIndex) =>
      addCategoryNode(child, id, childIndex),
    );
  };

  data.categories.forEach((node, index) => addCategoryNode(node, null, index));

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

/** Build a plan from a v3 serialized payload (assigns fresh IDs). */
export function planFromSerializedV3(
  data: SerializedBudgetV3,
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): BudgetPlan {
  return planFromSerializedV4(serializedV3ToV4(data), designLanguage);
}

/** Build a plan from any supported serialized payload (v2 / v3 / v4). */
export function planFromSerialized(
  data: AnySerializedBudget,
  designLanguage: DesignLanguage = DEFAULT_DESIGN_LANGUAGE,
): BudgetPlan {
  return planFromSerializedV4(upgradeSerializedBudget(data), designLanguage);
}

// ---------------------------------------------------------------------------
// Migration from legacy v2 / v3 shapes
// ---------------------------------------------------------------------------

/**
 * Convert a v3 serialized payload to v4. A v3 category is structurally a v4
 * category with no children, so this is a version-tag bump.
 */
export function serializedV3ToV4(data: SerializedBudgetV3): SerializedBudgetV4 {
  return { ...data, version: 4 };
}

/** Upgrade any supported serialized payload to v4. */
export function upgradeSerializedBudget(
  data: AnySerializedBudget,
): SerializedBudgetV4 {
  if ("version" in data && data.version === 4) return data;
  if ("version" in data && data.version === 3) return serializedV3ToV4(data);
  return serializedV3ToV4(serializedV2ToV3(data as SerializedBudget));
}

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

export function getSerializedPreview(data: SerializedBudgetV4): BudgetPreview {
  const sum = (items: { amount: number }[]) =>
    items.reduce((acc, item) => acc + item.amount, 0);

  // Roll a category and all of its descendants into one preview row.
  const summarizeSubtree = (
    category: SerializedCategoryV4,
  ): { total: number; itemCount: number; categoryCount: number } => {
    return (category.children ?? []).reduce(
      (acc, child) => {
        const childSummary = summarizeSubtree(child);
        return {
          total: acc.total + childSummary.total,
          itemCount: acc.itemCount + childSummary.itemCount,
          categoryCount: acc.categoryCount + childSummary.categoryCount,
        };
      },
      { total: sum(category.items), itemCount: category.items.length, categoryCount: 1 },
    );
  };

  const subtrees = data.categories.map(summarizeSubtree);
  const categories = data.categories.map((category, index) => ({
    name: category.name,
    total: subtrees[index].total,
    itemCount: subtrees[index].itemCount,
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
    categoryCount: subtrees.reduce((acc, subtree) => acc + subtree.categoryCount, 0),
    categories,
  };
}
