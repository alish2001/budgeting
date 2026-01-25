export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
}

export type CategoryName = "needs" | "wants" | "savings" | "income";
export type SpendingCategoryName = "needs" | "wants" | "savings";

export interface BudgetCategory {
  name: CategoryName;
  targetPercentage: number;
  items: BudgetItem[];
  color: string;
}

export type TargetPercentages = Record<SpendingCategoryName, number>;

export interface BudgetState {
  categories: Record<CategoryName, BudgetCategory>;
  targetPercentages: TargetPercentages;
  selectedCategory: CategoryName | "unbudgeted" | null;
}

export const CATEGORY_CONFIG: Record<
  CategoryName,
  { targetPercentage: number; color: string; label: string }
> = {
  needs: { targetPercentage: 50, color: "#ef4444", label: "Needs" },
  wants: { targetPercentage: 30, color: "#3b82f6", label: "Wants" },
  savings: { targetPercentage: 20, color: "#22c55e", label: "Savings" },
  income: { targetPercentage: 0, color: "#8b5cf6", label: "Income" },
};

// Serialization types for sharing budgets
export interface SerializedBudgetItem {
  label: string;
  amount: number;
}

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

// Saved budget types for multi-budget storage
export interface SavedBudget {
  id: string;
  name: string;
  createdAt: string;
  lastModifiedAt: string;
  data: SerializedBudget;
}
