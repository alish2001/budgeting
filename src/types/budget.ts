export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
}

export type CategoryName = 'needs' | 'wants' | 'savings';

export interface BudgetCategory {
  name: CategoryName;
  targetPercentage: number;
  items: BudgetItem[];
  color: string;
}

export interface BudgetState {
  categories: Record<CategoryName, BudgetCategory>;
  selectedCategory: CategoryName | null;
}

export const CATEGORY_CONFIG: Record<CategoryName, { targetPercentage: number; color: string; label: string }> = {
  needs: { targetPercentage: 50, color: '#ef4444', label: 'Needs' },
  wants: { targetPercentage: 30, color: '#3b82f6', label: 'Wants' },
  savings: { targetPercentage: 20, color: '#22c55e', label: 'Savings' },
};

