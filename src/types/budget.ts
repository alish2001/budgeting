// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
}

// ---------------------------------------------------------------------------
// Legacy (v2) static category model — retained for seeding defaults,
// onboarding copy, and migrating older persisted/shared data.
// ---------------------------------------------------------------------------

export type CategoryName = "needs" | "wants" | "savings" | "income";
export type SpendingCategoryName = "needs" | "wants" | "savings";

export type TargetPercentages = Record<SpendingCategoryName, number>;

export const CATEGORY_CONFIG: Record<
  CategoryName,
  { targetPercentage: number; color: string; label: string }
> = {
  needs: { targetPercentage: 50, color: "#ef4444", label: "Needs" },
  wants: { targetPercentage: 30, color: "#3b82f6", label: "Wants" },
  savings: { targetPercentage: 20, color: "#22c55e", label: "Savings" },
  income: { targetPercentage: 0, color: "#8b5cf6", label: "Income" },
};

// ---------------------------------------------------------------------------
// v3 dynamic domain model
//
// A BudgetPlan owns three normalized collections keyed by stable IDs:
//   - incomeItems:  income sources (kept separate from spending categories)
//   - categories:   user-defined spending categories (ordered, renameable)
//   - budgetItems:  line items, each pointing at zero or one category
//
// A budget item with categoryId === null is "unassigned" (orphaned). This
// leaves room for the future "budget of budgets" / subcategory work via
// BudgetCategory.parentCategoryId without another migration.
// ---------------------------------------------------------------------------

export type BudgetPlanId = string;
export type BudgetCategoryId = string;
export type BudgetItemId = string;

/** Pseudo-selection ids that are not real category ids. */
export type SpecialSelectionId = "income" | "unassigned" | "unbudgeted";

export interface IncomeItem {
  id: string;
  label: string;
  amount: number;
  sortOrder: number;
}

export interface BudgetCategory {
  id: BudgetCategoryId;
  name: string;
  targetPercentage: number;
  /** Stable hex color. Derived from the design-language palette at creation. */
  colorToken: string;
  sortOrder: number;
  /** Reserved for future subcategories / budget-of-budgets. */
  parentCategoryId?: BudgetCategoryId | null;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetLineItem {
  id: BudgetItemId;
  label: string;
  amount: number;
  /** null = unassigned / orphaned. */
  categoryId: BudgetCategoryId | null;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BudgetPlanSettings {
  /** What happens to a category's items when the category is deleted. */
  unassignedBehavior: "keep" | "delete";
}

export interface BudgetPlan {
  id: BudgetPlanId;
  name?: string;
  schemaVersion: 3;
  incomeItems: IncomeItem[];
  categories: BudgetCategory[];
  budgetItems: BudgetLineItem[];
  settings: BudgetPlanSettings;
  /** Transient UI selection — not persisted as meaningful data. */
  selectedCategoryId: BudgetCategoryId | SpecialSelectionId | null;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Serialization (sharing / import-export)
// ---------------------------------------------------------------------------

export interface SerializedBudgetItem {
  label: string;
  amount: number;
}

/** v3 share payload — IDs are stripped and regenerated on import. */
export interface SerializedCategoryV3 {
  name: string;
  targetPercentage: number;
  items: SerializedBudgetItem[];
}

export interface SerializedBudgetV3 {
  version: 3;
  name?: string;
  income: SerializedBudgetItem[];
  categories: SerializedCategoryV3[];
  unassigned?: SerializedBudgetItem[];
}

/** Legacy v2 share payload (no version field). */
export interface SerializedBudget {
  items: {
    needs: SerializedBudgetItem[];
    wants: SerializedBudgetItem[];
    savings: SerializedBudgetItem[];
    income: SerializedBudgetItem[];
  };
  targets?: {
    needs: number;
    wants: number;
    savings: number;
  };
}

export type AnySerializedBudget = SerializedBudgetV3 | SerializedBudget;

// ---------------------------------------------------------------------------
// Saved budgets (multi-budget storage)
// ---------------------------------------------------------------------------

export interface SavedBudget {
  id: string;
  name: string;
  createdAt: string;
  lastModifiedAt: string;
  data: SerializedBudgetV3;
}
