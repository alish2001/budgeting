import { useSyncExternalStore } from "react";
import { SavedBudget } from "@/types/budget";
import { getSavedBudgets, SAVED_BUDGETS_EVENT } from "@/lib/budget-storage";

let cachedBudgets: SavedBudget[] = [];
let cachedVersion = -1;
const budgetStorageListeners = new Set<() => void>();

function notifyBudgetStorageListeners() {
  cachedVersion = -1;
  budgetStorageListeners.forEach((listener) => listener());
}

function subscribeToBudgetStorage(callback: () => void) {
  budgetStorageListeners.add(callback);

  if (typeof window === "undefined") {
    return () => budgetStorageListeners.delete(callback);
  }

  const handleStorageChange = () => notifyBudgetStorageListeners();
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(SAVED_BUDGETS_EVENT, handleStorageChange);

  return () => {
    budgetStorageListeners.delete(callback);
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(SAVED_BUDGETS_EVENT, handleStorageChange);
  };
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
