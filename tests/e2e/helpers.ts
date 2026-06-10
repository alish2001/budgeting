import { type Page } from "@playwright/test";

export const V2_LEGACY_PAYLOAD = {
  version: 2,
  currentBudget: {
    categories: {
      income: { items: [{ id: "1", label: "Salary", amount: 5000 }] },
      needs: { items: [{ id: "2", label: "Rent", amount: 2000 }] },
      wants: { items: [{ id: "3", label: "Dining", amount: 400 }] },
      savings: { items: [{ id: "4", label: "Index", amount: 600 }] },
    },
    targetPercentages: { needs: 55, wants: 25, savings: 20 },
    currentBudgetName: "Legacy Budget",
  },
};

export const V2_SAVED_BUDGETS_PAYLOAD = {
  version: 2,
  savedBudgets: [
    {
      id: "sb1",
      name: "Old Saved Budget",
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      data: {
        items: {
          income: [{ label: "Freelance", amount: 3000 }],
          needs: [{ label: "Mortgage", amount: 1200 }],
          wants: [],
          savings: [],
        },
        targets: { needs: 50, wants: 30, savings: 20 },
      },
    },
  ],
};

/** Seed legacy v2 data into localStorage and reload. */
export async function seedV2Data(page: Page) {
  await page.evaluate(
    ([key, payload]) => localStorage.setItem(key, JSON.stringify(payload)),
    ["oversight-current-budget-v2", V2_LEGACY_PAYLOAD],
  );
  await page.reload();
  await page.waitForLoadState("networkidle");
}

/** Clear all localStorage keys used by the app. */
export async function clearAppStorage(page: Page) {
  await page.evaluate(() => {
    const keys = [
      "oversight-current-plan-v3",
      "oversight-saved-plans-v3",
      "oversight-app-meta-v3",
      "oversight-current-budget-v2",
      "oversight-saved-budgets-v2",
      "skipped-onboarding",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
  });
}

/** Read all relevant localStorage keys. */
export async function readStorage(page: Page) {
  return page.evaluate(() => {
    return {
      v3Plan: localStorage.getItem("oversight-current-plan-v3"),
      v3Saved: localStorage.getItem("oversight-saved-plans-v3"),
      v2Plan: localStorage.getItem("oversight-current-budget-v2"),
    };
  });
}

/** Go to dashboard with existing data (bypasses onboarding redirect). */
export async function goToDashboardWithData(page: Page) {
  // Seed minimal v3 data so the app doesn't redirect to onboarding
  const v3Plan = {
    version: 3,
    currentPlan: {
      id: "plan-1",
      name: "Test Budget",
      schemaVersion: 3,
      incomeItems: [{ id: "i1", label: "Salary", amount: 5000, sortOrder: 0 }],
      categories: [
        { id: "cat-needs", name: "Needs", targetPercentage: 50, colorToken: "#3b82f6", sortOrder: 0, parentCategoryId: null, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "cat-wants", name: "Wants", targetPercentage: 30, colorToken: "#8b5cf6", sortOrder: 1, parentCategoryId: null, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: "cat-savings", name: "Savings", targetPercentage: 20, colorToken: "#10b981", sortOrder: 2, parentCategoryId: null, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      budgetItems: [
        { id: "b1", label: "Rent", amount: 2000, categoryId: "cat-needs", sortOrder: 0 },
      ],
      settings: { unassignedBehavior: "keep" },
      selectedCategoryId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  await page.evaluate(
    ([key, payload]) => localStorage.setItem(key, JSON.stringify(payload)),
    ["oversight-current-plan-v3", v3Plan],
  );
  await page.evaluate(
    ([key, payload]) => localStorage.setItem(key, JSON.stringify(payload)),
    ["oversight-app-meta-v3", { version: 3, revision: 1, updatedAt: new Date().toISOString() }],
  );
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}
