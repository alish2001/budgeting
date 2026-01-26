import { SavedBudget, SerializedBudget, BudgetState } from "@/types/budget";
import { serializeBudget } from "@/lib/budget-serialization";

const SAVED_BUDGETS_KEY = "budget-planner-saved-budgets";

/**
 * Generate a human-readable auto name for a budget
 */
export function generateBudgetName(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return `Budget - ${now.toLocaleString("en-US", options)}`;
}

/**
 * Get all saved budgets from localStorage
 */
export function getSavedBudgets(): SavedBudget[] {
  try {
    const stored = localStorage.getItem(SAVED_BUDGETS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load saved budgets:", error);
  }
  return [];
}

/**
 * Save the current budget state as a new saved budget
 */
export function saveBudgetToStorage(
  state: BudgetState,
  name?: string,
): SavedBudget {
  const budgets = getSavedBudgets();
  const now = new Date().toISOString();

  const newBudget: SavedBudget = {
    id: crypto.randomUUID(),
    name: name || generateBudgetName(),
    createdAt: now,
    lastModifiedAt: now,
    data: serializeBudget(state),
  };

  budgets.unshift(newBudget); // Add to beginning
  localStorage.setItem(SAVED_BUDGETS_KEY, JSON.stringify(budgets));

  return newBudget;
}

/**
 * Save serialized budget data directly (for importing shared budgets)
 */
export function saveSerializedBudgetToStorage(
  data: SerializedBudget,
  name?: string,
): SavedBudget {
  const budgets = getSavedBudgets();
  const now = new Date().toISOString();

  const newBudget: SavedBudget = {
    id: crypto.randomUUID(),
    name: name || generateBudgetName(),
    createdAt: now,
    lastModifiedAt: now,
    data,
  };

  budgets.unshift(newBudget);
  localStorage.setItem(SAVED_BUDGETS_KEY, JSON.stringify(budgets));

  return newBudget;
}

/**
 * Get a specific saved budget by ID
 */
export function getSavedBudgetById(id: string): SavedBudget | null {
  const budgets = getSavedBudgets();
  return budgets.find((b) => b.id === id) || null;
}

/**
 * Update a saved budget's data
 */
export function updateSavedBudget(
  id: string,
  state: BudgetState,
): SavedBudget | null {
  const budgets = getSavedBudgets();
  const index = budgets.findIndex((b) => b.id === id);

  if (index === -1) return null;

  budgets[index] = {
    ...budgets[index],
    lastModifiedAt: new Date().toISOString(),
    data: serializeBudget(state),
  };

  localStorage.setItem(SAVED_BUDGETS_KEY, JSON.stringify(budgets));
  return budgets[index];
}

/**
 * Rename a saved budget
 */
export function renameSavedBudget(
  id: string,
  newName: string,
): SavedBudget | null {
  const budgets = getSavedBudgets();
  const index = budgets.findIndex((b) => b.id === id);

  if (index === -1) return null;

  budgets[index] = {
    ...budgets[index],
    name: newName.trim() || budgets[index].name,
    lastModifiedAt: new Date().toISOString(),
  };

  localStorage.setItem(SAVED_BUDGETS_KEY, JSON.stringify(budgets));
  return budgets[index];
}

/**
 * Delete a saved budget
 */
export function deleteSavedBudget(id: string): boolean {
  const budgets = getSavedBudgets();
  const filtered = budgets.filter((b) => b.id !== id);

  if (filtered.length === budgets.length) return false;

  localStorage.setItem(SAVED_BUDGETS_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Delete all saved budgets
 */
export function deleteAllSavedBudgets(): void {
  localStorage.removeItem(SAVED_BUDGETS_KEY);
}

/**
 * Format a date string for display
 */
export function formatBudgetDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleString("en-US", options);
}
