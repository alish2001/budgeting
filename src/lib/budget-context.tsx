"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  BudgetItem,
  BudgetState,
  CategoryName,
  SpendingCategoryName,
  CATEGORY_CONFIG,
  TargetPercentages,
  SerializedBudget,
  SavedBudget,
} from "@/types/budget";
import { serializeBudget } from "@/lib/budget-serialization";
import { generateBudgetName } from "@/lib/budget-storage";

export const CURRENT_BUDGET_STORAGE_KEY = "oversight-current-budget-v2";
export const SAVED_BUDGETS_STORAGE_KEY = "oversight-saved-budgets-v2";
export const APP_STATE_META_STORAGE_KEY = "oversight-app-meta-v2";

const APP_STATE_VERSION = 2;
const PERSIST_DEBOUNCE_MS = 200;
const ALL_CATEGORIES: CategoryName[] = ["needs", "wants", "savings", "income"];

// Hydration state management using useSyncExternalStore
const emptySubscribe = () => () => {};

function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface PersistedCurrentBudgetV2 {
  version: number;
  currentBudget: {
    categories: {
      needs: { items: BudgetItem[] };
      wants: { items: BudgetItem[] };
      savings: { items: BudgetItem[] };
      income: { items: BudgetItem[] };
    };
    targetPercentages: TargetPercentages;
    currentBudgetName?: string;
  };
}

interface PersistedSavedBudgetsV2 {
  version: number;
  savedBudgets: SavedBudget[];
}

interface PersistedMetaV2 {
  version: number;
  revision: number;
  updatedAt: string;
}

interface BudgetStoreState {
  currentBudget: BudgetState;
  savedBudgets: SavedBudget[];
  revision: number;
}

type BudgetAction =
  | { type: "HYDRATE"; storeState: BudgetStoreState }
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
  | { type: "IMPORT_BUDGET"; data: SerializedBudget }
  | { type: "SET_CURRENT_BUDGET_NAME"; name: string | undefined }
  | { type: "SAVE_CURRENT_BUDGET"; budget: SavedBudget; budgetName: string }
  | { type: "LOAD_SAVED_BUDGET"; budgetId: string }
  | { type: "RENAME_SAVED_BUDGET"; budget: SavedBudget }
  | { type: "DELETE_SAVED_BUDGET"; budgetId: string };

function createInitialBudgetState(): BudgetState {
  return {
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
}

function createInitialStoreState(): BudgetStoreState {
  return {
    currentBudget: createInitialBudgetState(),
    savedBudgets: [],
    revision: 0,
  };
}

function createBudgetStateFromSerialized(
  data: SerializedBudget,
  currentBudgetName?: string,
): BudgetState {
  const initial = createInitialBudgetState();

  const categories = ALL_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = {
        ...initial.categories[category],
        items: (data.items[category] || []).map((item) => ({
          id: crypto.randomUUID(),
          label: item.label,
          amount: item.amount,
        })),
      };
      return acc;
    },
    {} as BudgetState["categories"],
  );

  return {
    ...initial,
    categories,
    targetPercentages: data.targets || {
      needs: CATEGORY_CONFIG.needs.targetPercentage,
      wants: CATEGORY_CONFIG.wants.targetPercentage,
      savings: CATEGORY_CONFIG.savings.targetPercentage,
    },
    currentBudgetName,
    selectedCategory: null,
  };
}

function getBudgetNameOrDefault(name: string | undefined, fallback?: string): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed) {
    return trimmed;
  }

  const fallbackTrimmed = typeof fallback === "string" ? fallback.trim() : "";
  if (fallbackTrimmed) {
    return fallbackTrimmed;
  }

  return generateBudgetName();
}

function hasCurrentBudgetItems(currentBudget: BudgetState): boolean {
  return ALL_CATEGORIES.some(
    (category) => currentBudget.categories[category].items.length > 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeIsoDate(dateString: unknown, fallbackIso: string): string {
  if (typeof dateString === "string" && !Number.isNaN(Date.parse(dateString))) {
    return dateString;
  }

  return fallbackIso;
}

function normalizeBudgetAmount(amount: unknown): number | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return amount;
}

function normalizeBudgetItem(value: unknown): BudgetItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = typeof value.label === "string" ? value.label.trim() : "";
  const amount = normalizeBudgetAmount(value.amount);

  if (!label || amount === null) {
    return null;
  }

  const id = typeof value.id === "string" && value.id.trim() ? value.id : crypto.randomUUID();

  return {
    id,
    label,
    amount,
  };
}

function normalizeTargetPercentages(value: unknown): TargetPercentages {
  if (!isRecord(value)) {
    return {
      needs: CATEGORY_CONFIG.needs.targetPercentage,
      wants: CATEGORY_CONFIG.wants.targetPercentage,
      savings: CATEGORY_CONFIG.savings.targetPercentage,
    };
  }

  const needs =
    typeof value.needs === "number" && Number.isFinite(value.needs)
      ? value.needs
      : CATEGORY_CONFIG.needs.targetPercentage;
  const wants =
    typeof value.wants === "number" && Number.isFinite(value.wants)
      ? value.wants
      : CATEGORY_CONFIG.wants.targetPercentage;
  const savings =
    typeof value.savings === "number" && Number.isFinite(value.savings)
      ? value.savings
      : CATEGORY_CONFIG.savings.targetPercentage;

  return { needs, wants, savings };
}

function normalizeCurrentBudget(value: unknown): BudgetState | null {
  if (!isRecord(value) || !isRecord(value.categories)) {
    return null;
  }

  const initial = createInitialBudgetState();
  const categoriesSource = value.categories as Record<string, unknown>;

  const categories = ALL_CATEGORIES.reduce(
    (acc, category) => {
      const categoryValue = categoriesSource[category];
      const categoryData = isRecord(categoryValue)
        ? categoryValue
        : null;
      const items = Array.isArray(categoryData?.items)
        ? categoryData.items
            .map(normalizeBudgetItem)
            .filter((item): item is BudgetItem => item !== null)
        : [];

      acc[category] = {
        ...initial.categories[category],
        items,
      };
      return acc;
    },
    {} as BudgetState["categories"],
  );

  const currentBudgetName =
    typeof value.currentBudgetName === "string" && value.currentBudgetName.trim()
      ? value.currentBudgetName.trim()
      : undefined;

  return {
    ...initial,
    categories,
    targetPercentages: normalizeTargetPercentages(value.targetPercentages),
    currentBudgetName,
    selectedCategory: null,
  };
}

function normalizeSerializedBudget(value: unknown): SerializedBudget | null {
  if (!isRecord(value) || !isRecord(value.items)) {
    return null;
  }

  const items = {
    needs: [] as SerializedBudget["items"]["needs"],
    wants: [] as SerializedBudget["items"]["wants"],
    savings: [] as SerializedBudget["items"]["savings"],
    income: [] as SerializedBudget["items"]["income"],
  };

  for (const category of ALL_CATEGORIES) {
    const rawItems = value.items[category];
    if (!Array.isArray(rawItems)) {
      continue;
    }

    items[category] = rawItems
      .map((item): { label: string; amount: number } | null => {
        if (!isRecord(item)) {
          return null;
        }

        const label = typeof item.label === "string" ? item.label.trim() : "";
        const amount = normalizeBudgetAmount(item.amount);
        if (!label || amount === null) {
          return null;
        }

        return { label, amount };
      })
      .filter((item): item is { label: string; amount: number } => item !== null);
  }

  const targets = isRecord(value.targets)
    ? normalizeTargetPercentages(value.targets)
    : undefined;

  return {
    items,
    ...(targets ? { targets } : {}),
  };
}

function normalizeSavedBudget(value: unknown): SavedBudget | null {
  if (!isRecord(value)) {
    return null;
  }

  const data = normalizeSerializedBudget(value.data);
  if (!data) {
    return null;
  }

  const nowIso = new Date().toISOString();

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : crypto.randomUUID(),
    name: getBudgetNameOrDefault(
      typeof value.name === "string" ? value.name : undefined,
      undefined,
    ),
    createdAt: normalizeIsoDate(value.createdAt, nowIso),
    lastModifiedAt: normalizeIsoDate(value.lastModifiedAt, nowIso),
    data,
  };
}

function parsePersistedCurrentBudget(raw: string | null): BudgetState | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== APP_STATE_VERSION) {
      return null;
    }

    return normalizeCurrentBudget(parsed.currentBudget);
  } catch {
    return null;
  }
}

function parsePersistedSavedBudgets(raw: string | null): SavedBudget[] | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== APP_STATE_VERSION) {
      return null;
    }

    if (!Array.isArray(parsed.savedBudgets)) {
      return [];
    }

    return parsed.savedBudgets
      .map(normalizeSavedBudget)
      .filter((budget): budget is SavedBudget => budget !== null);
  } catch {
    return null;
  }
}

function parsePersistedMeta(raw: string | null): PersistedMetaV2 | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== APP_STATE_VERSION) {
      return null;
    }

    const revision =
      typeof parsed.revision === "number" && Number.isInteger(parsed.revision) && parsed.revision >= 0
        ? parsed.revision
        : null;

    if (revision === null) {
      return null;
    }

    const updatedAt =
      typeof parsed.updatedAt === "string" && !Number.isNaN(Date.parse(parsed.updatedAt))
        ? parsed.updatedAt
        : new Date().toISOString();

    return {
      version: APP_STATE_VERSION,
      revision,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function loadStoreFromStorage(): BudgetStoreState {
  const currentBudget =
    parsePersistedCurrentBudget(window.localStorage.getItem(CURRENT_BUDGET_STORAGE_KEY)) ||
    createInitialBudgetState();
  const savedBudgets =
    parsePersistedSavedBudgets(window.localStorage.getItem(SAVED_BUDGETS_STORAGE_KEY)) || [];
  const meta = parsePersistedMeta(window.localStorage.getItem(APP_STATE_META_STORAGE_KEY));

  if (hasCurrentBudgetItems(currentBudget) && !currentBudget.currentBudgetName) {
    currentBudget.currentBudgetName = generateBudgetName();
  }

  return {
    currentBudget,
    savedBudgets,
    revision: meta?.revision ?? 0,
  };
}

function toPersistedCurrentBudget(currentBudget: BudgetState): PersistedCurrentBudgetV2 {
  return {
    version: APP_STATE_VERSION,
    currentBudget: {
      categories: {
        needs: { items: currentBudget.categories.needs.items },
        wants: { items: currentBudget.categories.wants.items },
        savings: { items: currentBudget.categories.savings.items },
        income: { items: currentBudget.categories.income.items },
      },
      targetPercentages: currentBudget.targetPercentages,
      currentBudgetName: currentBudget.currentBudgetName,
    },
  };
}

function toPersistedSavedBudgets(savedBudgets: SavedBudget[]): PersistedSavedBudgetsV2 {
  return {
    version: APP_STATE_VERSION,
    savedBudgets,
  };
}

function toPersistedMeta(revision: number): PersistedMetaV2 {
  return {
    version: APP_STATE_VERSION,
    revision,
    updatedAt: new Date().toISOString(),
  };
}

function budgetReducer(state: BudgetStoreState, action: BudgetAction): BudgetStoreState {
  switch (action.type) {
    case "HYDRATE":
      return action.storeState;
    case "ADD_ITEM":
      return {
        ...state,
        currentBudget: {
          ...state.currentBudget,
          categories: {
            ...state.currentBudget.categories,
            [action.category]: {
              ...state.currentBudget.categories[action.category],
              items: [...state.currentBudget.categories[action.category].items, action.item],
            },
          },
        },
        revision: state.revision + 1,
      };
    case "REMOVE_ITEM":
      return {
        ...state,
        currentBudget: {
          ...state.currentBudget,
          categories: {
            ...state.currentBudget.categories,
            [action.category]: {
              ...state.currentBudget.categories[action.category],
              items: state.currentBudget.categories[action.category].items.filter(
                (item) => item.id !== action.itemId,
              ),
            },
          },
        },
        revision: state.revision + 1,
      };
    case "UPDATE_ITEM":
      return {
        ...state,
        currentBudget: {
          ...state.currentBudget,
          categories: {
            ...state.currentBudget.categories,
            [action.category]: {
              ...state.currentBudget.categories[action.category],
              items: state.currentBudget.categories[action.category].items.map((item) =>
                item.id === action.item.id ? action.item : item,
              ),
            },
          },
        },
        revision: state.revision + 1,
      };
    case "SET_SELECTED_CATEGORY":
      return {
        ...state,
        currentBudget: {
          ...state.currentBudget,
          selectedCategory: action.category,
        },
      };
    case "UPDATE_TARGET_PERCENTAGES":
      return {
        ...state,
        currentBudget: {
          ...state.currentBudget,
          targetPercentages: action.targets,
        },
        revision: state.revision + 1,
      };
    case "CLEAR_ALL":
      return {
        ...state,
        currentBudget: createInitialBudgetState(),
        revision: state.revision + 1,
      };
    case "IMPORT_BUDGET":
      return {
        ...state,
        currentBudget: createBudgetStateFromSerialized(
          action.data,
          state.currentBudget.currentBudgetName,
        ),
        revision: state.revision + 1,
      };
    case "SET_CURRENT_BUDGET_NAME":
      return {
        ...state,
        currentBudget: {
          ...state.currentBudget,
          currentBudgetName: action.name,
        },
        revision: state.revision + 1,
      };
    case "SAVE_CURRENT_BUDGET":
      return {
        ...state,
        currentBudget: {
          ...state.currentBudget,
          currentBudgetName: action.budgetName,
        },
        savedBudgets: [action.budget, ...state.savedBudgets],
        revision: state.revision + 1,
      };
    case "LOAD_SAVED_BUDGET": {
      const budget = state.savedBudgets.find((item) => item.id === action.budgetId);
      if (!budget) {
        return state;
      }

      return {
        ...state,
        currentBudget: createBudgetStateFromSerialized(budget.data, budget.name),
        revision: state.revision + 1,
      };
    }
    case "RENAME_SAVED_BUDGET":
      return {
        ...state,
        savedBudgets: state.savedBudgets.map((budget) =>
          budget.id === action.budget.id ? action.budget : budget,
        ),
        revision: state.revision + 1,
      };
    case "DELETE_SAVED_BUDGET":
      return {
        ...state,
        savedBudgets: state.savedBudgets.filter((budget) => budget.id !== action.budgetId),
        revision: state.revision + 1,
      };
    default:
      return state;
  }
}

interface BudgetContextType {
  state: BudgetState;
  savedBudgets: SavedBudget[];
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
  importBudget: (data: SerializedBudget) => void;
  exportBudget: () => SerializedBudget;
  setCurrentBudgetName: (name: string | undefined) => void;
  saveCurrentBudget: (name?: string) => SavedBudget;
  loadSavedBudget: (id: string) => boolean;
  renameSavedBudget: (id: string, newName: string) => SavedBudget | null;
  deleteSavedBudget: (id: string) => boolean;
  getSavedBudgetById: (id: string) => SavedBudget | null;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [storeState, dispatch] = useReducer(budgetReducer, undefined, createInitialStoreState);
  const isHydrated = useIsHydrated();
  const hasLoadedFromStorage = useRef(false);
  const latestStoreStateRef = useRef(storeState);
  const persistTimeoutRef = useRef<number | null>(null);
  const pendingSlicesRef = useRef({ currentBudget: false, savedBudgets: false });
  const lastPersistedRevisionRef = useRef(storeState.revision);
  const lastPersistedCurrentRef = useRef(storeState.currentBudget);
  const lastPersistedSavedBudgetsRef = useRef(storeState.savedBudgets);

  useEffect(() => {
    latestStoreStateRef.current = storeState;
  }, [storeState]);

  const flushPersistedState = useCallback(() => {
    if (!hasLoadedFromStorage.current || typeof window === "undefined") {
      return;
    }

    const nextState = latestStoreStateRef.current;
    const pending = pendingSlicesRef.current;

    if (
      !pending.currentBudget &&
      !pending.savedBudgets &&
      nextState.revision === lastPersistedRevisionRef.current
    ) {
      return;
    }

    try {
      if (pending.currentBudget) {
        window.localStorage.setItem(
          CURRENT_BUDGET_STORAGE_KEY,
          JSON.stringify(toPersistedCurrentBudget(nextState.currentBudget)),
        );
        lastPersistedCurrentRef.current = nextState.currentBudget;
      }

      if (pending.savedBudgets) {
        window.localStorage.setItem(
          SAVED_BUDGETS_STORAGE_KEY,
          JSON.stringify(toPersistedSavedBudgets(nextState.savedBudgets)),
        );
        lastPersistedSavedBudgetsRef.current = nextState.savedBudgets;
      }

      if (pending.currentBudget || pending.savedBudgets) {
        window.localStorage.setItem(
          APP_STATE_META_STORAGE_KEY,
          JSON.stringify(toPersistedMeta(nextState.revision)),
        );
      }

      pendingSlicesRef.current = { currentBudget: false, savedBudgets: false };
      lastPersistedRevisionRef.current = nextState.revision;
    } catch (error) {
      console.error("Failed to persist budget data:", error);
    }
  }, []);

  // Load from localStorage after hydration (client-side only)
  useEffect(() => {
    if (!isHydrated || hasLoadedFromStorage.current) {
      return;
    }

    hasLoadedFromStorage.current = true;

    const hydratedStoreState = loadStoreFromStorage();
    latestStoreStateRef.current = hydratedStoreState;
    lastPersistedRevisionRef.current = hydratedStoreState.revision;
    lastPersistedCurrentRef.current = hydratedStoreState.currentBudget;
    lastPersistedSavedBudgetsRef.current = hydratedStoreState.savedBudgets;
    pendingSlicesRef.current = { currentBudget: false, savedBudgets: false };

    dispatch({ type: "HYDRATE", storeState: hydratedStoreState });
  }, [isHydrated]);

  // Debounced persistence for app state mutations
  useEffect(() => {
    if (!isHydrated || !hasLoadedFromStorage.current) {
      return;
    }

    if (storeState.revision === lastPersistedRevisionRef.current) {
      return;
    }

    if (storeState.currentBudget !== lastPersistedCurrentRef.current) {
      pendingSlicesRef.current.currentBudget = true;
    }

    if (storeState.savedBudgets !== lastPersistedSavedBudgetsRef.current) {
      pendingSlicesRef.current.savedBudgets = true;
    }

    if (!pendingSlicesRef.current.currentBudget && !pendingSlicesRef.current.savedBudgets) {
      return;
    }

    if (persistTimeoutRef.current !== null) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      persistTimeoutRef.current = null;
      flushPersistedState();
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
    };
  }, [flushPersistedState, isHydrated, storeState]);

  // Flush pending writes when tab is hidden or closed
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const handleBeforeUnload = () => {
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
      flushPersistedState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }

      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
      flushPersistedState();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushPersistedState, isHydrated]);

  // Live sync with changes from other tabs using shared revision metadata
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== APP_STATE_META_STORAGE_KEY || event.newValue === null) {
        return;
      }

      const incomingMeta = parsePersistedMeta(event.newValue);
      if (!incomingMeta) {
        return;
      }

      if (incomingMeta.revision <= latestStoreStateRef.current.revision) {
        return;
      }

      const incomingCurrentBudget = parsePersistedCurrentBudget(
        window.localStorage.getItem(CURRENT_BUDGET_STORAGE_KEY),
      );
      if (!incomingCurrentBudget) {
        return;
      }

      const incomingSavedBudgets =
        parsePersistedSavedBudgets(window.localStorage.getItem(SAVED_BUDGETS_STORAGE_KEY)) || [];

      const incomingStoreState: BudgetStoreState = {
        currentBudget: incomingCurrentBudget,
        savedBudgets: incomingSavedBudgets,
        revision: incomingMeta.revision,
      };

      if (
        hasCurrentBudgetItems(incomingStoreState.currentBudget) &&
        !incomingStoreState.currentBudget.currentBudgetName
      ) {
        incomingStoreState.currentBudget.currentBudgetName = generateBudgetName();
      }

      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }

      pendingSlicesRef.current = { currentBudget: false, savedBudgets: false };
      latestStoreStateRef.current = incomingStoreState;
      lastPersistedRevisionRef.current = incomingStoreState.revision;
      lastPersistedCurrentRef.current = incomingStoreState.currentBudget;
      lastPersistedSavedBudgetsRef.current = incomingStoreState.savedBudgets;
      dispatch({ type: "HYDRATE", storeState: incomingStoreState });
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [isHydrated]);

  // Keep a usable default name whenever a budget has data.
  useEffect(() => {
    if (
      !hasLoadedFromStorage.current ||
      !hasCurrentBudgetItems(storeState.currentBudget) ||
      storeState.currentBudget.currentBudgetName
    ) {
      return;
    }

    dispatch({
      type: "SET_CURRENT_BUDGET_NAME",
      name: generateBudgetName(),
    });
  }, [storeState.currentBudget]);

  const addItem = useCallback(
    (category: CategoryName, label: string, amount: number) => {
      const item: BudgetItem = {
        id: crypto.randomUUID(),
        label,
        amount,
      };
      dispatch({ type: "ADD_ITEM", category, item });
    },
    [],
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
    [],
  );

  const getTotalByCategory = useCallback(
    (category: CategoryName): number => {
      return storeState.currentBudget.categories[category].items.reduce(
        (sum, item) => sum + item.amount,
        0,
      );
    },
    [storeState.currentBudget.categories],
  );

  // Total income from all sources
  const totalIncome = useMemo(() => {
    return storeState.currentBudget.categories.income.items.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
  }, [storeState.currentBudget.categories.income.items]);

  // Total spending (needs + wants + savings, excluding income)
  const totalSpending = useMemo(() => {
    return (
      storeState.currentBudget.categories.needs.items.reduce((sum, item) => sum + item.amount, 0) +
      storeState.currentBudget.categories.wants.items.reduce((sum, item) => sum + item.amount, 0) +
      storeState.currentBudget.categories.savings.items.reduce((sum, item) => sum + item.amount, 0)
    );
  }, [storeState.currentBudget.categories]);

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
    [totalIncome, getTotalByCategory],
  );

  // Legacy function - kept for compatibility but calculates as % of spending
  const getPercentageByCategory = useCallback(
    (category: CategoryName): number => {
      if (totalSpending === 0) return 0;
      return (getTotalByCategory(category) / totalSpending) * 100;
    },
    [totalSpending, getTotalByCategory],
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
      return storeState.currentBudget.targetPercentages[category];
    },
    [storeState.currentBudget.targetPercentages],
  );

  const clearAllData = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const importBudget = useCallback((data: SerializedBudget) => {
    dispatch({ type: "IMPORT_BUDGET", data });
  }, []);

  const exportBudget = useCallback((): SerializedBudget => {
    return serializeBudget(storeState.currentBudget);
  }, [storeState.currentBudget]);

  const setCurrentBudgetName = useCallback((name: string | undefined) => {
    dispatch({ type: "SET_CURRENT_BUDGET_NAME", name });
  }, []);

  const saveCurrentBudget = useCallback(
    (name?: string): SavedBudget => {
      const budgetName = getBudgetNameOrDefault(name, storeState.currentBudget.currentBudgetName);
      const now = new Date().toISOString();

      const budget: SavedBudget = {
        id: crypto.randomUUID(),
        name: budgetName,
        createdAt: now,
        lastModifiedAt: now,
        data: serializeBudget(storeState.currentBudget),
      };

      dispatch({ type: "SAVE_CURRENT_BUDGET", budget, budgetName });
      return budget;
    },
    [storeState.currentBudget],
  );

  const loadSavedBudget = useCallback(
    (id: string): boolean => {
      const exists = storeState.savedBudgets.some((budget) => budget.id === id);
      if (!exists) {
        return false;
      }

      dispatch({ type: "LOAD_SAVED_BUDGET", budgetId: id });
      return true;
    },
    [storeState.savedBudgets],
  );

  const renameSavedBudget = useCallback(
    (id: string, newName: string): SavedBudget | null => {
      const existing = storeState.savedBudgets.find((budget) => budget.id === id);
      if (!existing) {
        return null;
      }

      const name = newName.trim();
      if (!name || name === existing.name) {
        return existing;
      }

      const updatedBudget: SavedBudget = {
        ...existing,
        name,
        lastModifiedAt: new Date().toISOString(),
      };

      dispatch({ type: "RENAME_SAVED_BUDGET", budget: updatedBudget });
      return updatedBudget;
    },
    [storeState.savedBudgets],
  );

  const deleteSavedBudget = useCallback(
    (id: string): boolean => {
      const exists = storeState.savedBudgets.some((budget) => budget.id === id);
      if (!exists) {
        return false;
      }

      dispatch({ type: "DELETE_SAVED_BUDGET", budgetId: id });
      return true;
    },
    [storeState.savedBudgets],
  );

  const getSavedBudgetById = useCallback(
    (id: string): SavedBudget | null => {
      return storeState.savedBudgets.find((budget) => budget.id === id) || null;
    },
    [storeState.savedBudgets],
  );

  return (
    <BudgetContext.Provider
      value={{
        state: storeState.currentBudget,
        savedBudgets: storeState.savedBudgets,
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
        importBudget,
        exportBudget,
        setCurrentBudgetName,
        saveCurrentBudget,
        loadSavedBudget,
        renameSavedBudget,
        deleteSavedBudget,
        getSavedBudgetById,
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
