import { expect, test, describe } from "bun:test";
import {
  createDefaultPlan,
  createCategory,
  getChildCategories,
  getTopLevelCategories,
  getDescendantCategoryIds,
  getSubtreeCategoryIds,
  isDescendantOf,
  wouldCreateCycle,
  getSubtreeItemTotal,
  getEffectiveTarget,
  getChildTargetTotal,
  hasChildTargetOverflow,
  getCategoryPath,
  getCategoryPathLabel,
  getCategoriesInTreeOrder,
  reindexSiblingGroups,
  promoteChildrenOf,
  repairCategoryTree,
  serializePlan,
  planFromSerializedV4,
  planFromSerialized,
  serializedV3ToV4,
  getSerializedPreview,
  getTargetTotal,
  nextCategorySortOrder,
} from "@/lib/budget-plan";
import type {
  BudgetCategory,
  BudgetPlan,
  SerializedBudget,
  SerializedBudgetV3,
} from "@/types/budget";

function category(
  id: string,
  overrides: Partial<BudgetCategory> = {},
): BudgetCategory {
  return {
    id,
    name: id,
    targetPercentage: 0,
    colorToken: "#64748b",
    sortOrder: 0,
    parentCategoryId: null,
    ...overrides,
  };
}

/**
 * Three-level fixture with items at every level:
 *
 *   Needs (target 20, item 100)
 *   ├── Housing (target 15, item 1000)
 *   │   └── Utilities (target 5, item 200)
 *   └── Food (target 10, item 400)
 *   Wants (target 50, item 300)
 */
function buildTreePlan(): BudgetPlan {
  const plan = createDefaultPlan();
  plan.categories = [
    category("needs", { name: "Needs", targetPercentage: 20, sortOrder: 0 }),
    category("wants", { name: "Wants", targetPercentage: 50, sortOrder: 1 }),
    category("housing", {
      name: "Housing",
      targetPercentage: 15,
      parentCategoryId: "needs",
      sortOrder: 0,
    }),
    category("food", {
      name: "Food",
      targetPercentage: 10,
      parentCategoryId: "needs",
      sortOrder: 1,
    }),
    category("utilities", {
      name: "Utilities",
      targetPercentage: 5,
      parentCategoryId: "housing",
      sortOrder: 0,
    }),
  ];
  plan.budgetItems = [
    { id: "b1", label: "Misc needs", amount: 100, categoryId: "needs", sortOrder: 0 },
    { id: "b2", label: "Rent", amount: 1000, categoryId: "housing", sortOrder: 0 },
    { id: "b3", label: "Hydro", amount: 200, categoryId: "utilities", sortOrder: 0 },
    { id: "b4", label: "Groceries", amount: 400, categoryId: "food", sortOrder: 0 },
    { id: "b5", label: "Games", amount: 300, categoryId: "wants", sortOrder: 0 },
    { id: "b6", label: "Mystery", amount: 50, categoryId: null, sortOrder: 0 },
  ];
  return plan;
}

describe("tree selectors", () => {
  const plan = buildTreePlan();

  test("getTopLevelCategories returns only roots, in order", () => {
    expect(getTopLevelCategories(plan).map((c) => c.id)).toEqual([
      "needs",
      "wants",
    ]);
  });

  test("getChildCategories returns sorted siblings of a parent", () => {
    expect(getChildCategories(plan, "needs").map((c) => c.id)).toEqual([
      "housing",
      "food",
    ]);
    expect(getChildCategories(plan, "utilities")).toEqual([]);
  });

  test("getDescendantCategoryIds excludes the category itself", () => {
    expect(getDescendantCategoryIds(plan.categories, "needs").sort()).toEqual([
      "food",
      "housing",
      "utilities",
    ]);
    expect(getDescendantCategoryIds(plan.categories, "wants")).toEqual([]);
  });

  test("getSubtreeCategoryIds includes the category itself", () => {
    expect(getSubtreeCategoryIds(plan.categories, "housing")).toEqual([
      "housing",
      "utilities",
    ]);
  });

  test("isDescendantOf walks any depth", () => {
    expect(isDescendantOf(plan.categories, "utilities", "needs")).toBe(true);
    expect(isDescendantOf(plan.categories, "needs", "utilities")).toBe(false);
    expect(isDescendantOf(plan.categories, "wants", "needs")).toBe(false);
  });

  test("getCategoriesInTreeOrder is depth-first pre-order with depths", () => {
    expect(
      getCategoriesInTreeOrder(plan).map(({ category, depth }) => [
        category.id,
        depth,
      ]),
    ).toEqual([
      ["needs", 0],
      ["housing", 1],
      ["utilities", 2],
      ["food", 1],
      ["wants", 0],
    ]);
  });

  test("getCategoryPath / getCategoryPathLabel run root → self", () => {
    expect(getCategoryPath(plan, "utilities").map((c) => c.id)).toEqual([
      "needs",
      "housing",
      "utilities",
    ]);
    expect(getCategoryPathLabel(plan, "utilities")).toBe(
      "Needs › Housing › Utilities",
    );
    expect(getCategoryPathLabel(plan, "wants")).toBe("Wants");
  });

  test("nextCategorySortOrder is sibling-scoped", () => {
    expect(nextCategorySortOrder(plan, null)).toBe(2);
    expect(nextCategorySortOrder(plan, "needs")).toBe(2);
    expect(nextCategorySortOrder(plan, "utilities")).toBe(0);
  });
});

describe("rollups (union semantics)", () => {
  const plan = buildTreePlan();

  test("getSubtreeItemTotal sums own items plus all descendants'", () => {
    expect(getSubtreeItemTotal(plan, "utilities")).toBe(200);
    expect(getSubtreeItemTotal(plan, "housing")).toBe(1200);
    expect(getSubtreeItemTotal(plan, "needs")).toBe(1700);
    expect(getSubtreeItemTotal(plan, "wants")).toBe(300);
  });

  test("getEffectiveTarget sums the subtree's targets", () => {
    expect(getEffectiveTarget(plan, "needs")).toBe(50);
    expect(getEffectiveTarget(plan, "housing")).toBe(20);
    expect(getEffectiveTarget(plan, "wants")).toBe(50);
  });

  test("top-level effective targets equal the plan-wide target total", () => {
    const topLevelSum = getTopLevelCategories(plan).reduce(
      (sum, c) => sum + getEffectiveTarget(plan, c.id),
      0,
    );
    expect(topLevelSum).toBe(getTargetTotal(plan));
  });

  test("hasChildTargetOverflow flags children exceeding the parent's own target", () => {
    // Needs own 20 < children effective 30 → overflow.
    expect(getChildTargetTotal(buildTreePlan(), "needs")).toBe(30);
    expect(hasChildTargetOverflow(buildTreePlan(), "needs")).toBe(true);
    // Housing own 15 ≥ child 5 → fine.
    expect(hasChildTargetOverflow(buildTreePlan(), "housing")).toBe(false);
  });

  test("own target of 0 is not a warning state", () => {
    const plan = buildTreePlan();
    plan.categories = plan.categories.map((c) =>
      c.id === "needs" ? { ...c, targetPercentage: 0 } : c,
    );
    expect(hasChildTargetOverflow(plan, "needs")).toBe(false);
  });
});

describe("wouldCreateCycle", () => {
  const { categories } = buildTreePlan();

  test("self, child, and grandchild are cycles", () => {
    expect(wouldCreateCycle(categories, "needs", "needs")).toBe(true);
    expect(wouldCreateCycle(categories, "needs", "housing")).toBe(true);
    expect(wouldCreateCycle(categories, "needs", "utilities")).toBe(true);
  });

  test("unrelated targets and top-level are fine", () => {
    expect(wouldCreateCycle(categories, "needs", "wants")).toBe(false);
    expect(wouldCreateCycle(categories, "utilities", "wants")).toBe(false);
    expect(wouldCreateCycle(categories, "needs", null)).toBe(false);
  });
});

describe("promoteChildrenOf", () => {
  test("re-attaches direct children to the deleted node's parent", () => {
    const { categories } = buildTreePlan();
    const promoted = promoteChildrenOf(categories, "housing");
    const utilities = promoted.find((c) => c.id === "utilities");
    expect(utilities?.parentCategoryId).toBe("needs");
    // Appended after the existing "needs" children (housing 0, food 1).
    expect(utilities?.sortOrder).toBe(2);
  });

  test("children of a top-level node become top-level", () => {
    const { categories } = buildTreePlan();
    const promoted = promoteChildrenOf(categories, "needs");
    expect(promoted.find((c) => c.id === "housing")?.parentCategoryId).toBeNull();
    expect(promoted.find((c) => c.id === "food")?.parentCategoryId).toBeNull();
    // Utilities keeps pointing at housing, which survives.
    expect(promoted.find((c) => c.id === "utilities")?.parentCategoryId).toBe(
      "housing",
    );
  });
});

describe("repairCategoryTree", () => {
  test("orphaned parent references become top-level", () => {
    const repaired = repairCategoryTree([
      category("a", { parentCategoryId: "ghost" }),
      category("b"),
    ]);
    expect(repaired.find((c) => c.id === "a")?.parentCategoryId).toBeNull();
  });

  test("self-parent is broken", () => {
    const repaired = repairCategoryTree([category("a", { parentCategoryId: "a" })]);
    expect(repaired[0].parentCategoryId).toBeNull();
  });

  test("a → b → a cycles are broken", () => {
    const repaired = repairCategoryTree([
      category("a", { parentCategoryId: "b" }),
      category("b", { parentCategoryId: "a" }),
    ]);
    const byId = new Map(repaired.map((c) => [c.id, c]));
    // No category may still sit on a cycle.
    for (const c of repaired) {
      expect(wouldCreateCycle(repaired, c.id, c.parentCategoryId ?? null)).toBe(false);
    }
    expect(
      [byId.get("a"), byId.get("b")].some((c) => c?.parentCategoryId === null),
    ).toBe(true);
  });

  test("sibling groups are reindexed densely", () => {
    const repaired = repairCategoryTree([
      category("a", { sortOrder: 5 }),
      category("b", { sortOrder: 9 }),
      category("c", { parentCategoryId: "a", sortOrder: 7 }),
    ]);
    expect(repaired.find((c) => c.id === "a")?.sortOrder).toBe(0);
    expect(repaired.find((c) => c.id === "b")?.sortOrder).toBe(1);
    expect(repaired.find((c) => c.id === "c")?.sortOrder).toBe(0);
  });

  test("reindexSiblingGroups keeps relative order within each group", () => {
    const reindexed = reindexSiblingGroups([
      category("b", { sortOrder: 3 }),
      category("a", { sortOrder: 1 }),
      category("x", { parentCategoryId: "a", sortOrder: 10 }),
    ]);
    expect(reindexed.find((c) => c.id === "a")?.sortOrder).toBe(0);
    expect(reindexed.find((c) => c.id === "b")?.sortOrder).toBe(1);
    expect(reindexed.find((c) => c.id === "x")?.sortOrder).toBe(0);
  });
});

describe("v4 serialization", () => {
  test("serializePlan nests children and round-trips the hierarchy", () => {
    const plan = buildTreePlan();
    const data = serializePlan(plan);

    expect(data.version).toBe(4);
    expect(data.categories.map((c) => c.name)).toEqual(["Needs", "Wants"]);
    const needs = data.categories[0];
    expect(needs.children?.map((c) => c.name)).toEqual(["Housing", "Food"]);
    expect(needs.children?.[0].children?.map((c) => c.name)).toEqual(["Utilities"]);
    expect(data.unassigned).toEqual([{ label: "Mystery", amount: 50 }]);

    const rebuilt = planFromSerializedV4(data);
    expect(
      getCategoriesInTreeOrder(rebuilt).map(({ category, depth }) => [
        category.name,
        depth,
      ]),
    ).toEqual([
      ["Needs", 0],
      ["Housing", 1],
      ["Utilities", 2],
      ["Food", 1],
      ["Wants", 0],
    ]);

    const rebuiltHousing = rebuilt.categories.find((c) => c.name === "Housing");
    expect(getSubtreeItemTotal(rebuilt, rebuiltHousing!.id)).toBe(1200);
  });

  test("fresh ids are assigned on import", () => {
    const plan = buildTreePlan();
    const rebuilt = planFromSerializedV4(serializePlan(plan));
    const originalIds = new Set(plan.categories.map((c) => c.id));
    for (const c of rebuilt.categories) {
      expect(originalIds.has(c.id)).toBe(false);
    }
  });

  test("v3 payloads import as flat top-level categories", () => {
    const v3: SerializedBudgetV3 = {
      version: 3,
      income: [{ label: "Salary", amount: 5000 }],
      categories: [
        { name: "Needs", targetPercentage: 50, items: [{ label: "Rent", amount: 2000 }] },
        { name: "Wants", targetPercentage: 30, items: [] },
      ],
    };
    const plan = planFromSerialized(v3);
    expect(getTopLevelCategories(plan)).toHaveLength(2);
    expect(plan.categories.every((c) => (c.parentCategoryId ?? null) === null)).toBe(true);

    const v4 = serializedV3ToV4(v3);
    expect(v4.version).toBe(4);
    expect(v4.categories).toEqual(v3.categories);
  });

  test("v2 payloads import through the full upgrade chain", () => {
    const v2: SerializedBudget = {
      items: {
        income: [{ label: "Salary", amount: 3000 }],
        needs: [{ label: "Rent", amount: 1000 }],
        wants: [],
        savings: [],
      },
    };
    const plan = planFromSerialized(v2);
    expect(getTopLevelCategories(plan).map((c) => c.name)).toEqual([
      "Needs",
      "Wants",
      "Savings",
    ]);
  });

  test("getSerializedPreview rolls subtrees into top-level rows", () => {
    const preview = getSerializedPreview(serializePlan(buildTreePlan()));
    expect(preview.categoryCount).toBe(5);
    expect(preview.categories.map((c) => c.name)).toEqual(["Needs", "Wants"]);
    expect(preview.categories[0].total).toBe(1700);
    expect(preview.categories[0].itemCount).toBe(4);
    expect(preview.totalBudgeted).toBe(2050); // 1700 + 300 + 50 unassigned
    expect(preview.itemCount).toBe(6); // 5 categorized items + 1 unassigned
  });
});

describe("createCategory with a parent", () => {
  test("assigns sibling-scoped sortOrder and the parent id", () => {
    const plan = buildTreePlan();
    const child = createCategory(plan, "Internet", { parentCategoryId: "housing" });
    expect(child.parentCategoryId).toBe("housing");
    expect(child.sortOrder).toBe(1); // after utilities
  });
});
