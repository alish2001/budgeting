"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useRef,
  useSyncExternalStore,
  useCallback,
  useMemo,
} from "react";
import {
  BudgetItem,
  BudgetState,
  CategoryName,
  SpendingCategoryName,
  CATEGORY_CONFIG,
  TargetPercentages,
} from "@/types/budget";

const STORAGE_KEY = "budget-planner-data";

// Hydration state management using useSyncExternalStore
const emptySubscribe = () => () => {};
function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

type BudgetAction =
  | { type: "ADD_ITEM"; category: CategoryName; item: BudgetItem }
  | { type: "REMOVE_ITEM"; category: CategoryName; itemId: string }
  | { type: "UPDATE_ITEM"; category: CategoryName; item: BudgetItem }
  | {
      type: "SET_SELECTED_CATEGORY";
      category: CategoryName | "unbudgeted" | null;
    }
  | {
      type: "UPDATE_TARGET_PERCENTAGES";
      targets: TargetPercentages;
    }
  | { type: "CLEAR_ALL" }
  | { type: "LOAD_FROM_STORAGE"; state: BudgetState };

const initialState: BudgetState = {
  categories: {
    needs: {
      name: "needs",
      targetPercentage: CATEGORY_CONFIG.needs.targetPercentage,
      items: [],
      color: CATEGORY_CONFIG.needs.color,
    },
    wants: {
      name: "wants",
      targetPercentage: CATEGORY_CONFIG.wants.targetPercentage,
      items: [],
      color: CATEGORY_CONFIG.wants.color,
    },
    savings: {
      name: "savings",
      targetPercentage: CATEGORY_CONFIG.savings.targetPercentage,
      items: [],
      color: CATEGORY_CONFIG.savings.color,
    },
    income: {
      name: "income",
      targetPercentage: CATEGORY_CONFIG.income.targetPercentage,
      items: [],
      color: CATEGORY_CONFIG.income.color,
    },
  },
  targetPercentages: {
    needs: CATEGORY_CONFIG.needs.targetPercentage,
    wants: CATEGORY_CONFIG.wants.targetPercentage,
    savings: CATEGORY_CONFIG.savings.targetPercentage,
  },
  selectedCategory: null,
};

function loadFromStorage(): BudgetState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...initialState,
        categories: {
          needs: {
            ...initialState.categories.needs,
            items: parsed.categories?.needs?.items || [],
          },
          wants: {
            ...initialState.categories.wants,
            items: parsed.categories?.wants?.items || [],
          },
          savings: {
            ...initialState.categories.savings,
            items: parsed.categories?.savings?.items || [],
          },
          income: {
            ...initialState.categories.income,
            items: parsed.categories?.income?.items || [],
          },
        },
        targetPercentages:
          parsed.targetPercentages &&
          typeof parsed.targetPercentages === "object"
            ? {
                needs:
                  Number(parsed.targetPercentages.needs) ||
                  CATEGORY_CONFIG.needs.targetPercentage,
                wants:
                  Number(parsed.targetPercentages.wants) ||
                  CATEGORY_CONFIG.wants.targetPercentage,
                savings:
                  Number(parsed.targetPercentages.savings) ||
                  CATEGORY_CONFIG.savings.targetPercentage,
              }
            : initialState.targetPercentages,
        selectedCategory: null,
      };
    }
  } catch (error) {
    console.error("Failed to load budget data from storage:", error);
  }
  return null;
}

function saveToStorage(state: BudgetState): void {
  try {
    const dataToSave = {
      categories: {
        needs: { items: state.categories.needs.items },
        wants: { items: state.categories.wants.items },
        savings: { items: state.categories.savings.items },
        income: { items: state.categories.income.items },
      },
      targetPercentages: state.targetPercentages,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Failed to save budget data to storage:", error);
  }
}

function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
  switch (action.type) {
    case "LOAD_FROM_STORAGE":
      return action.state;
    case "CLEAR_ALL":
      return initialState;
    case "ADD_ITEM":
      return {
        ...state,
        categories: {
          ...state.categories,
          [action.category]: {
            ...state.categories[action.category],
            items: [...state.categories[action.category].items, action.item],
          },
        },
      };
    case "REMOVE_ITEM":
      return {
        ...state,
        categories: {
          ...state.categories,
          [action.category]: {
            ...state.categories[action.category],
            items: state.categories[action.category].items.filter(
              (item) => item.id !== action.itemId
            ),
          },
        },
      };
    case "UPDATE_ITEM":
      return {
        ...state,
        categories: {
          ...state.categories,
          [action.category]: {
            ...state.categories[action.category],
            items: state.categories[action.category].items.map((item) =>
              item.id === action.item.id ? action.item : item
            ),
          },
        },
      };
    case "SET_SELECTED_CATEGORY":
      return {
        ...state,
        selectedCategory: action.category,
      };
    case "UPDATE_TARGET_PERCENTAGES":
      return {
        ...state,
        targetPercentages: action.targets,
      };
    default:
      return state;
  }
}

interface BudgetContextType {
  state: BudgetState;
  isHydrated: boolean;
  addItem: (category: CategoryName, label: string, amount: number) => void;
  removeItem: (category: CategoryName, itemId: string) => void;
  updateItem: (category: CategoryName, item: BudgetItem) => void;
  setSelectedCategory: (category: CategoryName | "unbudgeted" | null) => void;
  updateTargetPercentages: (targets: TargetPercentages) => void;
  resetTargetPercentages: () => void;
  getTargetPercentage: (category: SpendingCategoryName) => number;
  getTotalByCategory: (category: CategoryName) => number;
  getTotalIncome: () => number;
  getUnbudgetedAmount: () => number;
  getGrandTotal: () => number;
  getPercentageByCategory: (category: CategoryName) => number;
  getPercentageOfIncome: (category: SpendingCategoryName) => number;
  clearAllData: () => void;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(budgetReducer, initialState);
  const isHydrated = useIsHydrated();
  const hasLoadedFromStorage = useRef(false);

  // Load from localStorage after hydration (client-side only)
  useEffect(() => {
    if (!hasLoadedFromStorage.current) {
      hasLoadedFromStorage.current = true;
      const savedState = loadFromStorage();
      if (savedState) {
        dispatch({ type: "LOAD_FROM_STORAGE", state: savedState });
      }
    }
  }, []);

  // Save to localStorage whenever state changes (after initial load)
  useEffect(() => {
    if (hasLoadedFromStorage.current) {
      saveToStorage(state);
    }
  }, [state]);

  const addItem = useCallback(
    (category: CategoryName, label: string, amount: number) => {
      const item: BudgetItem = {
        id: crypto.randomUUID(),
        label,
        amount,
      };
      dispatch({ type: "ADD_ITEM", category, item });
    },
    []
  );

  const removeItem = useCallback((category: CategoryName, itemId: string) => {
    dispatch({ type: "REMOVE_ITEM", category, itemId });
  }, []);

  const updateItem = useCallback((category: CategoryName, item: BudgetItem) => {
    dispatch({ type: "UPDATE_ITEM", category, item });
  }, []);

  const setSelectedCategory = useCallback(
    (category: CategoryName | "unbudgeted" | null) => {
      dispatch({ type: "SET_SELECTED_CATEGORY", category });
    },
    []
  );

  const getTotalByCategory = useCallback(
    (category: CategoryName): number => {
      return state.categories[category].items.reduce(
        (sum, item) => sum + item.amount,
        0
      );
    },
    [state.categories]
  );

  // Total income from all sources
  const totalIncome = useMemo(() => {
    return state.categories.income.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );
  }, [state.categories.income.items]);

  // Total spending (needs + wants + savings, excluding income)
  const totalSpending = useMemo(() => {
    return (
      state.categories.needs.items.reduce((sum, item) => sum + item.amount, 0) +
      state.categories.wants.items.reduce((sum, item) => sum + item.amount, 0) +
      state.categories.savings.items.reduce((sum, item) => sum + item.amount, 0)
    );
  }, [state.categories]);

  // Unbudgeted amount (income - spending)
  const unbudgetedAmount = useMemo(() => {
    return totalIncome - totalSpending;
  }, [totalIncome, totalSpending]);

  const getTotalIncome = useCallback((): number => {
    return totalIncome;
  }, [totalIncome]);

  const getUnbudgetedAmount = useCallback((): number => {
    return unbudgetedAmount;
  }, [unbudgetedAmount]);

  // Legacy function - now returns total spending (for backward compatibility)
  const getGrandTotal = useCallback((): number => {
    return totalSpending;
  }, [totalSpending]);

  // Get percentage of income (for spending categories)
  const getPercentageOfIncome = useCallback(
    (category: SpendingCategoryName): number => {
      if (totalIncome === 0) return 0;
      return (getTotalByCategory(category) / totalIncome) * 100;
    },
    [totalIncome, getTotalByCategory]
  );

  // Legacy function - kept for compatibility but calculates as % of spending
  const getPercentageByCategory = useCallback(
    (category: CategoryName): number => {
      if (totalSpending === 0) return 0;
      return (getTotalByCategory(category) / totalSpending) * 100;
    },
    [totalSpending, getTotalByCategory]
  );

  const updateTargetPercentages = useCallback((targets: TargetPercentages) => {
    dispatch({ type: "UPDATE_TARGET_PERCENTAGES", targets });
  }, []);

  const resetTargetPercentages = useCallback(() => {
    dispatch({
      type: "UPDATE_TARGET_PERCENTAGES",
      targets: {
        needs: CATEGORY_CONFIG.needs.targetPercentage,
        wants: CATEGORY_CONFIG.wants.targetPercentage,
        savings: CATEGORY_CONFIG.savings.targetPercentage,
      },
    });
  }, []);

  const getTargetPercentage = useCallback(
    (category: SpendingCategoryName): number => {
      return state.targetPercentages[category];
    },
    [state.targetPercentages]
  );

  const clearAllData = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <BudgetContext.Provider
      value={{
        state,
        isHydrated,
        addItem,
        removeItem,
        updateItem,
        setSelectedCategory,
        updateTargetPercentages,
        resetTargetPercentages,
        getTargetPercentage,
        getTotalByCategory,
        getTotalIncome,
        getUnbudgetedAmount,
        getGrandTotal,
        getPercentageByCategory,
        getPercentageOfIncome,
        clearAllData,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider");
  }
  return context;
}
