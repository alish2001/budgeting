import { expect, test, describe } from "bun:test";
import pako from "pako";
import {
  createDefaultPlan,
  serializePlan,
  planFromSerializedV3,
  serializedV2ToV3,
  getSortedCategories,
  getItemsForCategory,
  getUnassignedItems,
  getTotalIncome,
  getTotalBudgeted,
  getUnbudgetedAmount,
  getSerializedPreview,
} from "@/lib/budget-plan";
import { encodeBudget, decodeBudget } from "@/lib/budget-serialization";
import type { SerializedBudget, SerializedBudgetV3 } from "@/types/budget";

describe("createDefaultPlan", () => {
  test("seeds Needs / Wants / Savings at 50/30/20", () => {
    const plan = createDefaultPlan();
    const categories = getSortedCategories(plan);
    expect(categories.map((c) => c.name)).toEqual(["Needs", "Wants", "Savings"]);
    expect(categories.map((c) => c.targetPercentage)).toEqual([50, 30, 20]);
    expect(plan.incomeItems).toHaveLength(0);
    expect(plan.budgetItems).toHaveLength(0);
  });
});

describe("v2 -> v3 migration", () => {
  const v2: SerializedBudget = {
    items: {
      income: [{ label: "Salary", amount: 5000 }],
      needs: [{ label: "Rent", amount: 2000 }],
      wants: [{ label: "Dining", amount: 400 }],
      savings: [{ label: "Index funds", amount: 600 }],
    },
    targets: { needs: 55, wants: 25, savings: 20 },
  };

  test("maps fixed categories and targets into v3", () => {
    const v3 = serializedV2ToV3(v2);
    expect(v3.version).toBe(3);
    expect(v3.income).toEqual([{ label: "Salary", amount: 5000 }]);
    expect(v3.categories.map((c) => c.name)).toEqual(["Needs", "Wants", "Savings"]);
    expect(v3.categories.map((c) => c.targetPercentage)).toEqual([55, 25, 20]);
    expect(v3.categories[0].items).toEqual([{ label: "Rent", amount: 2000 }]);
  });

  test("builds a usable plan with correct totals", () => {
    const plan = planFromSerializedV3(serializedV2ToV3(v2));
    expect(getTotalIncome(plan)).toBe(5000);
    expect(getTotalBudgeted(plan)).toBe(3000);
    expect(getUnbudgetedAmount(plan)).toBe(2000);

    const needs = getSortedCategories(plan)[0];
    expect(getItemsForCategory(plan, needs.id)).toHaveLength(1);
  });

  test("missing v2 targets fall back to 50/30/20", () => {
    const v3 = serializedV2ToV3({ items: v2.items });
    expect(v3.categories.map((c) => c.targetPercentage)).toEqual([50, 30, 20]);
  });
});

describe("serialize / encode round-trips", () => {
  function buildPlan() {
    const plan = createDefaultPlan();
    const [needs, wants] = getSortedCategories(plan);
    plan.name = "My Plan";
    plan.incomeItems.push({ id: "i1", label: "Salary", amount: 4000, sortOrder: 0 });
    plan.budgetItems.push(
      { id: "b1", label: "Rent", amount: 1500, categoryId: needs.id, sortOrder: 0 },
      { id: "b2", label: "Games", amount: 100, categoryId: wants.id, sortOrder: 0 },
      { id: "b3", label: "Mystery", amount: 50, categoryId: null, sortOrder: 0 },
    );
    return plan;
  }

  test("serializePlan keeps categories, items and unassigned", () => {
    const data = serializePlan(buildPlan());
    expect(data.name).toBe("My Plan");
    expect(data.income).toEqual([{ label: "Salary", amount: 4000 }]);
    expect(data.categories).toHaveLength(3);
    expect(data.unassigned).toEqual([{ label: "Mystery", amount: 50 }]);
  });

  test("encode -> decode is lossless for v3", () => {
    const data = serializePlan(buildPlan());
    const decoded = decodeBudget(encodeBudget(buildPlan()));
    expect(decoded).toEqual(data);
  });

  test("planFromSerializedV3 preserves the unassigned lane", () => {
    const plan = buildPlan();
    const rebuilt = planFromSerializedV3(serializePlan(plan));
    expect(getUnassignedItems(rebuilt)).toHaveLength(1);
    expect(getUnassignedItems(rebuilt)[0].label).toBe("Mystery");
  });
});

describe("decodeBudget accepts legacy v2 share codes", () => {
  test("a v2-style payload decodes into v3", () => {
    // Manually craft a v2 encoded code using the legacy shape.
    const v2: SerializedBudget = {
      items: {
        income: [{ label: "Salary", amount: 3000 }],
        needs: [{ label: "Rent", amount: 1000 }],
        wants: [],
        savings: [],
      },
    };
    const json = JSON.stringify(v2);
    // The encode path is v3-only; emulate a legacy v2 code by deflating directly.
    const compressed = pako.deflate(json);
    const base64 = btoa(String.fromCharCode(...compressed))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const decoded = decodeBudget(base64) as SerializedBudgetV3;
    expect(decoded.version).toBe(3);
    expect(decoded.categories.map((c) => c.name)).toEqual(["Needs", "Wants", "Savings"]);
    expect(decoded.income).toEqual([{ label: "Salary", amount: 3000 }]);
  });
});

describe("preview", () => {
  test("summarizes income, categories and items", () => {
    const plan = createDefaultPlan();
    const [needs] = getSortedCategories(plan);
    plan.incomeItems.push({ id: "i1", label: "Salary", amount: 5000, sortOrder: 0 });
    plan.budgetItems.push({ id: "b1", label: "Rent", amount: 2000, categoryId: needs.id, sortOrder: 0 });

    const preview = getSerializedPreview(serializePlan(plan));
    expect(preview.totalIncome).toBe(5000);
    expect(preview.totalBudgeted).toBe(2000);
    expect(preview.categoryCount).toBe(3);
    expect(preview.itemCount).toBe(2); // 1 income + 1 budget item
  });
});
