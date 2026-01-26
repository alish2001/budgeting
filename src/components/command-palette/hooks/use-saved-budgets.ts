import { useSyncExternalStore } from "react";
import { SavedBudget } from "@/types/budget";
import { getSavedBudgets } from "@/lib/budget-storage";

let cachedBudgets: SavedBudget[] = [];
let cachedVersion = -1;
const budgetStorageListeners = new Set<() => void>();

function subscribeToBudgetStorage(callback: () => void) {
  budgetStorageListeners.add(callback);
  return () => budgetStorageListeners.delete(callback);
}

function getBudgetStorageSnapshot(): SavedBudget[] {
  if (cachedVersion === -1) {
    cachedBudgets = getSavedBudgets();
    cachedVersion = 0;
  }
  return cachedBudgets;
}

const EMPTY_SAVED_BUDGETS: SavedBudget[] = [];

function getServerSnapshot(): SavedBudget[] {
  return EMPTY_SAVED_BUDGETS;
}

export function useSavedBudgets() {
  return useSyncExternalStore(
    subscribeToBudgetStorage,
    getBudgetStorageSnapshot,
    getServerSnapshot
  );
}

export function invalidateBudgetCache() {
  cachedVersion = -1;
  cachedBudgets = getSavedBudgets();
  budgetStorageListeners.forEach((listener) => listener());
}
