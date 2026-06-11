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
  AnySerializedBudget,
  BudgetCategory,
  BudgetLineItem,
  BudgetPlan,
  IncomeItem,
  SavedBudget,
  SerializedBudgetV4,
  SerializedCategoryV4,
  SpecialSelectionId,
} from "@/types/budget";
import {
  createCategory,
  createDefaultPlan,
  createId,
  getEffectiveTarget,
  getSubtreeCategoryIds,
  getSubtreeItemTotal,
  getTotalBudgeted,
  getTotalForCategory,
  getTotalIncome as selectTotalIncome,
  hasPlanData,
  nextIncomeSortOrder,
  nextItemSortOrder,
  planFromSerialized,
  planFromSerializedV3,
  serializedV3ToV4,
  promoteChildrenOf,
  reindexSiblingGroups,
  repairCategoryTree,
  serializePlan,
  serializedV2ToV3,
  wouldCreateCycle,
} from "@/lib/budget-plan";
import { generateBudgetName } from "@/lib/budget-storage";

// v3 storage keys
export const CURRENT_PLAN_STORAGE_KEY = "oversight-current-plan-v3";
export const SAVED_PLANS_STORAGE_KEY = "oversight-saved-plans-v3";
export const APP_STATE_META_STORAGE_KEY = "oversight-app-meta-v3";

// Legacy v2 keys (read once, then migrated forward)
const LEGACY_CURRENT_BUDGET_KEY = "oversight-current-budget-v2";
const LEGACY_SAVED_BUDGETS_KEY = "oversight-saved-budgets-v2";

const APP_STATE_VERSION = 3;
const PERSIST_DEBOUNCE_MS = 200;

// ---------------------------------------------------------------------------
// Hydration helper
// ---------------------------------------------------------------------------

const emptySubscribe = () => () => {};

function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

interface PersistedCurrentPlanV3 {
  version: number;
  currentPlan: BudgetPlan;
}

interface PersistedSavedPlansV3 {
  version: number;
  savedBudgets: SavedBudget[];
}

interface PersistedMetaV3 {
  version: number;
  revision: number;
  updatedAt: string;
}

interface BudgetStoreState {
  currentPlan: BudgetPlan;
  savedBudgets: SavedBudget[];
  revision: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type BudgetAction =
  | { type: "HYDRATE"; storeState: BudgetStoreState }
  | { type: "ADD_INCOME_ITEM"; item: IncomeItem }
  | { type: "UPDATE_INCOME_ITEM"; id: string; label: string; amount: number }
  | { type: "REMOVE_INCOME_ITEM"; id: string }
  | { type: "ADD_CATEGORY"; category: BudgetCategory }
  | { type: "RENAME_CATEGORY"; categoryId: string; name: string }
  | { type: "UPDATE_CATEGORY_TARGET"; categoryId: string; targetPercentage: number }
  | { type: "SET_CATEGORY_TARGETS"; targets: Record<string, number> }
  | {
      type: "DELETE_CATEGORY";
      categoryId: string;
      behavior: "keep" | "delete";
      childBehavior: "promote" | "delete-subtree";
    }
  | {
      type: "MOVE_CATEGORY";
      categoryId: string;
      newParentId: string | null;
      index?: number;
    }
  | {
      type: "REORDER_CATEGORIES";
      parentId: string | null;
      orderedCategoryIds: string[];
    }
  | { type: "ADD_BUDGET_ITEM"; item: BudgetLineItem }
  | { type: "UPDATE_BUDGET_ITEM"; id: string; label: string; amount: number }
  | { type: "REMOVE_BUDGET_ITEM"; id: string }
  | { type: "MOVE_BUDGET_ITEM"; id: string; categoryId: string | null; index?: number }
  | { type: "SET_SELECTED_CATEGORY"; categoryId: string | SpecialSelectionId | null }
  | { type: "CLEAR_ALL" }
  | { type: "IMPORT_PLAN"; plan: BudgetPlan }
  | { type: "SET_CURRENT_BUDGET_NAME"; name: string | undefined }
  | { type: "SAVE_CURRENT_BUDGET"; budget: SavedBudget; budgetName: string }
  | { type: "LOAD_SAVED_BUDGET"; budgetId: string }
  | { type: "RENAME_SAVED_BUDGET"; budget: SavedBudget }
  | { type: "DELETE_SAVED_BUDGET"; budgetId: string };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

function createInitialStoreState(): BudgetStoreState {
  return {
    currentPlan: createDefaultPlan(),
    savedBudgets: [],
    revision: 0,
  };
}

function getBudgetNameOrDefault(name: string | undefined, fallback?: string): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed) return trimmed;

  const fallbackTrimmed = typeof fallback === "string" ? fallback.trim() : "";
  if (fallbackTrimmed) return fallbackTrimmed;

  return generateBudgetName();
}

// ---------------------------------------------------------------------------
// Normalization / parsing
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeIsoDate(dateString: unknown, fallbackIso: string): string {
  if (typeof dateString === "string" && !Number.isNaN(Date.parse(dateString))) {
    return dateString;
  }
  return fallbackIso;
}

function normalizeAmount(amount: unknown): number | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return amount;
}

function normalizeLabel(label: unknown): string {
  return typeof label === "string" ? label.trim() : "";
}

function normalizePlan(value: unknown): BudgetPlan | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.categories) || !Array.isArray(value.budgetItems)) {
    return null;
  }

  const now = new Date().toISOString();
  const knownCategoryIds = new Set<string>();

  const categories: BudgetCategory[] = value.categories
    .map((raw, index): BudgetCategory | null => {
      if (!isRecord(raw)) return null;
      const id =
        typeof raw.id === "string" && raw.id.trim() ? raw.id : createId();
      const name = normalizeLabel(raw.name) || "Category";
      const targetPercentage =
        typeof raw.targetPercentage === "number" &&
        Number.isFinite(raw.targetPercentage)
          ? raw.targetPercentage
          : 0;
      const colorToken =
        typeof raw.colorToken === "string" && raw.colorToken.trim()
          ? raw.colorToken
          : "#64748b";
      const sortOrder =
        typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
          ? raw.sortOrder
          : index;
      knownCategoryIds.add(id);
      return {
        id,
        name,
        targetPercentage,
        colorToken,
        sortOrder,
        parentCategoryId:
          typeof raw.parentCategoryId === "string" ? raw.parentCategoryId : null,
        isDefault: raw.isDefault === true,
        createdAt: normalizeIsoDate(raw.createdAt, now),
        updatedAt: normalizeIsoDate(raw.updatedAt, now),
      };
    })
    .filter((category): category is BudgetCategory => category !== null);

  const budgetItems: BudgetLineItem[] = value.budgetItems
    .map((raw, index): BudgetLineItem | null => {
      if (!isRecord(raw)) return null;
      const label = normalizeLabel(raw.label);
      const amount = normalizeAmount(raw.amount);
      if (!label || amount === null) return null;
      const categoryId =
        typeof raw.categoryId === "string" && knownCategoryIds.has(raw.categoryId)
          ? raw.categoryId
          : null;
      return {
        id: typeof raw.id === "string" && raw.id.trim() ? raw.id : createId(),
        label,
        amount,
        categoryId,
        sortOrder:
          typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
            ? raw.sortOrder
            : index,
      };
    })
    .filter((item): item is BudgetLineItem => item !== null);

  const incomeItems: IncomeItem[] = Array.isArray(value.incomeItems)
    ? value.incomeItems
        .map((raw, index): IncomeItem | null => {
          if (!isRecord(raw)) return null;
          const label = normalizeLabel(raw.label);
          const amount = normalizeAmount(raw.amount);
          if (!label || amount === null) return null;
          return {
            id: typeof raw.id === "string" && raw.id.trim() ? raw.id : createId(),
            label,
            amount,
            sortOrder:
              typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
                ? raw.sortOrder
                : index,
          };
        })
        .filter((item): item is IncomeItem => item !== null)
    : [];

  const settingsBehavior =
    isRecord(value.settings) && value.settings.unassignedBehavior === "delete"
      ? "delete"
      : "keep";

  const name =
    typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : undefined;

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : createId(),
    name,
    schemaVersion: 3,
    incomeItems,
    categories: repairCategoryTree(categories),
    budgetItems,
    settings: { unassignedBehavior: settingsBehavior },
    selectedCategoryId: null,
    createdAt: normalizeIsoDate(value.createdAt, now),
    updatedAt: normalizeIsoDate(value.updatedAt, now),
  };
}

// Defensive bound on `children` recursion when reading untrusted payloads.
const MAX_SERIALIZED_CATEGORY_DEPTH = 32;

/** Accepts v3 or v4 saved-budget payloads, always returning v4. */
function normalizeSerializedBudget(value: unknown): SerializedBudgetV4 | null {
  if (!isRecord(value) || (value.version !== 3 && value.version !== 4)) {
    return null;
  }
  if (!Array.isArray(value.income) || !Array.isArray(value.categories)) {
    return null;
  }

  const cleanItems = (raw: unknown) =>
    Array.isArray(raw)
      ? raw
          .map((item) => {
            if (!isRecord(item)) return null;
            const label = normalizeLabel(item.label);
            const amount = normalizeAmount(item.amount);
            if (!label || amount === null) return null;
            return { label, amount };
          })
          .filter((item): item is { label: string; amount: number } => item !== null)
      : [];

  const cleanCategories = (raw: unknown, depth: number): SerializedCategoryV4[] =>
    Array.isArray(raw) && depth < MAX_SERIALIZED_CATEGORY_DEPTH
      ? raw
          .map((entry): SerializedCategoryV4 | null => {
            if (!isRecord(entry)) return null;
            const category: SerializedCategoryV4 = {
              name: normalizeLabel(entry.name) || "Category",
              targetPercentage:
                typeof entry.targetPercentage === "number" &&
                Number.isFinite(entry.targetPercentage)
                  ? entry.targetPercentage
                  : 0,
              items: cleanItems(entry.items),
            };
            const children = cleanCategories(entry.children, depth + 1);
            if (children.length > 0) category.children = children;
            return category;
          })
          .filter((category): category is SerializedCategoryV4 => category !== null)
      : [];

  return {
    version: 4,
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name.trim()
        : undefined,
    income: cleanItems(value.income),
    categories: cleanCategories(value.categories, 0),
    unassigned: value.unassigned ? cleanItems(value.unassigned) : undefined,
  };
}

function normalizeSavedBudget(value: unknown): SavedBudget | null {
  if (!isRecord(value)) return null;

  const data = normalizeSerializedBudget(value.data);
  if (!data) return null;

  const nowIso = new Date().toISOString();

  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : createId(),
    name: getBudgetNameOrDefault(
      typeof value.name === "string" ? value.name : undefined,
      undefined,
    ),
    createdAt: normalizeIsoDate(value.createdAt, nowIso),
    lastModifiedAt: normalizeIsoDate(value.lastModifiedAt, nowIso),
    data,
  };
}

// ---------------------------------------------------------------------------
// Legacy v2 migration
// ---------------------------------------------------------------------------

function migrateLegacyCurrentBudget(raw: string | null): BudgetPlan | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.currentBudget)) return null;
    const budget = parsed.currentBudget as Record<string, unknown>;
    const categories = isRecord(budget.categories) ? budget.categories : {};

    const pickItems = (key: string) => {
      const cat = (categories as Record<string, unknown>)[key];
      const items = isRecord(cat) && Array.isArray(cat.items) ? cat.items : [];
      return items
        .map((item) => {
          if (!isRecord(item)) return null;
          const label = normalizeLabel(item.label);
          const amount = normalizeAmount(item.amount);
          if (!label || amount === null) return null;
          return { label, amount };
        })
        .filter((item): item is { label: string; amount: number } => item !== null);
    };

    const targets = isRecord(budget.targetPercentages)
      ? budget.targetPercentages
      : {};
    const targetFor = (key: string, fallback: number) =>
      typeof (targets as Record<string, unknown>)[key] === "number"
        ? ((targets as Record<string, number>)[key] as number)
        : fallback;

    const serialized = serializedV2ToV3({
      items: {
        needs: pickItems("needs"),
        wants: pickItems("wants"),
        savings: pickItems("savings"),
        income: pickItems("income"),
      },
      targets: {
        needs: targetFor("needs", 50),
        wants: targetFor("wants", 30),
        savings: targetFor("savings", 20),
      },
    });

    const plan = planFromSerializedV3(serialized);
    const name =
      typeof budget.currentBudgetName === "string" && budget.currentBudgetName.trim()
        ? budget.currentBudgetName.trim()
        : undefined;
    plan.name = name;
    return plan;
  } catch {
    return null;
  }
}

function migrateLegacySavedBudgets(raw: string | null): SavedBudget[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.savedBudgets)) return [];

    return parsed.savedBudgets
      .map((value): SavedBudget | null => {
        if (!isRecord(value) || !isRecord(value.data)) return null;
        const legacyData = value.data as Record<string, unknown>;
        if (!isRecord(legacyData.items)) return null;
        const items = legacyData.items as Record<string, unknown>;

        const pick = (key: string) =>
          Array.isArray(items[key])
            ? (items[key] as unknown[])
                .map((item) => {
                  if (!isRecord(item)) return null;
                  const label = normalizeLabel(item.label);
                  const amount = normalizeAmount(item.amount);
                  if (!label || amount === null) return null;
                  return { label, amount };
                })
                .filter((item): item is { label: string; amount: number } => item !== null)
            : [];

        const legacyTargets = isRecord(legacyData.targets)
          ? (legacyData.targets as Record<string, unknown>)
          : null;
        const targetFor = (key: string, fallback: number) =>
          legacyTargets && typeof legacyTargets[key] === "number"
            ? (legacyTargets[key] as number)
            : fallback;

        const data = serializedV3ToV4(
          serializedV2ToV3({
            items: {
              needs: pick("needs"),
              wants: pick("wants"),
              savings: pick("savings"),
              income: pick("income"),
            },
            targets: legacyTargets
              ? {
                  needs: targetFor("needs", 50),
                  wants: targetFor("wants", 30),
                  savings: targetFor("savings", 20),
                }
              : undefined,
          }),
        );

        const nowIso = new Date().toISOString();
        return {
          id: typeof value.id === "string" && value.id.trim() ? value.id : createId(),
          name: getBudgetNameOrDefault(
            typeof value.name === "string" ? value.name : undefined,
          ),
          createdAt: normalizeIsoDate(value.createdAt, nowIso),
          lastModifiedAt: normalizeIsoDate(value.lastModifiedAt, nowIso),
          data,
        };
      })
      .filter((budget): budget is SavedBudget => budget !== null);
  } catch {
    return [];
  }
}

function parsePersistedCurrentPlan(raw: string | null): BudgetPlan | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== APP_STATE_VERSION) return null;
    return normalizePlan(parsed.currentPlan);
  } catch {
    return null;
  }
}

function parsePersistedSavedPlans(raw: string | null): SavedBudget[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== APP_STATE_VERSION) return null;
    if (!Array.isArray(parsed.savedBudgets)) return [];
    return parsed.savedBudgets
      .map(normalizeSavedBudget)
      .filter((budget): budget is SavedBudget => budget !== null);
  } catch {
    return null;
  }
}

function parsePersistedMeta(raw: string | null): PersistedMetaV3 | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== APP_STATE_VERSION) return null;

    const revision =
      typeof parsed.revision === "number" &&
      Number.isInteger(parsed.revision) &&
      parsed.revision >= 0
        ? parsed.revision
        : null;
    if (revision === null) return null;

    const updatedAt =
      typeof parsed.updatedAt === "string" &&
      !Number.isNaN(Date.parse(parsed.updatedAt))
        ? parsed.updatedAt
        : new Date().toISOString();

    return { version: APP_STATE_VERSION, revision, updatedAt };
  } catch {
    return null;
  }
}

function loadStoreFromStorage(): BudgetStoreState {
  // 1. Prefer v3 data.
  let currentPlan = parsePersistedCurrentPlan(
    window.localStorage.getItem(CURRENT_PLAN_STORAGE_KEY),
  );
  let savedBudgets = parsePersistedSavedPlans(
    window.localStorage.getItem(SAVED_PLANS_STORAGE_KEY),
  );

  // 2. Fall back to migrating legacy v2 data.
  if (!currentPlan) {
    currentPlan =
      migrateLegacyCurrentBudget(
        window.localStorage.getItem(LEGACY_CURRENT_BUDGET_KEY),
      ) || createDefaultPlan();
  }
  if (savedBudgets === null) {
    savedBudgets = migrateLegacySavedBudgets(
      window.localStorage.getItem(LEGACY_SAVED_BUDGETS_KEY),
    );
  }

  const meta = parsePersistedMeta(
    window.localStorage.getItem(APP_STATE_META_STORAGE_KEY),
  );

  if (hasPlanData(currentPlan) && !currentPlan.name) {
    currentPlan.name = generateBudgetName();
  }

  return {
    currentPlan,
    savedBudgets,
    revision: meta?.revision ?? 0,
  };
}

function toPersistedCurrentPlan(currentPlan: BudgetPlan): PersistedCurrentPlanV3 {
  return { version: APP_STATE_VERSION, currentPlan };
}

function toPersistedSavedPlans(savedBudgets: SavedBudget[]): PersistedSavedPlansV3 {
  return { version: APP_STATE_VERSION, savedBudgets };
}

function toPersistedMeta(revision: number): PersistedMetaV3 {
  return {
    version: APP_STATE_VERSION,
    revision,
    updatedAt: new Date().toISOString(),
  };
}

/** Lightweight check used by route guards without spinning up the provider. */
export function readStoredPlanHasData(): boolean {
  try {
    const v3 = parsePersistedCurrentPlan(
      window.localStorage.getItem(CURRENT_PLAN_STORAGE_KEY),
    );
    if (v3) return hasPlanData(v3);

    const legacy = migrateLegacyCurrentBudget(
      window.localStorage.getItem(LEGACY_CURRENT_BUDGET_KEY),
    );
    return legacy ? hasPlanData(legacy) : false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Reducer helpers
// ---------------------------------------------------------------------------

function withPlan(
  state: BudgetStoreState,
  updater: (plan: BudgetPlan) => BudgetPlan,
): BudgetStoreState {
  return {
    ...state,
    currentPlan: { ...updater(state.currentPlan), updatedAt: new Date().toISOString() },
    revision: state.revision + 1,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function budgetReducer(state: BudgetStoreState, action: BudgetAction): BudgetStoreState {
  switch (action.type) {
    case "HYDRATE":
      return action.storeState;

    case "ADD_INCOME_ITEM":
      return withPlan(state, (plan) => ({
        ...plan,
        incomeItems: [...plan.incomeItems, action.item],
      }));

    case "UPDATE_INCOME_ITEM":
      return withPlan(state, (plan) => ({
        ...plan,
        incomeItems: plan.incomeItems.map((item) =>
          item.id === action.id
            ? { ...item, label: action.label, amount: action.amount }
            : item,
        ),
      }));

    case "REMOVE_INCOME_ITEM":
      return withPlan(state, (plan) => ({
        ...plan,
        incomeItems: plan.incomeItems.filter((item) => item.id !== action.id),
      }));

    case "ADD_CATEGORY":
      return withPlan(state, (plan) => ({
        ...plan,
        categories: [...plan.categories, action.category],
      }));

    case "RENAME_CATEGORY":
      return withPlan(state, (plan) => ({
        ...plan,
        categories: plan.categories.map((category) =>
          category.id === action.categoryId
            ? { ...category, name: action.name, updatedAt: new Date().toISOString() }
            : category,
        ),
      }));

    case "UPDATE_CATEGORY_TARGET":
      return withPlan(state, (plan) => ({
        ...plan,
        categories: plan.categories.map((category) =>
          category.id === action.categoryId
            ? { ...category, targetPercentage: action.targetPercentage }
            : category,
        ),
      }));

    case "SET_CATEGORY_TARGETS":
      return withPlan(state, (plan) => ({
        ...plan,
        categories: plan.categories.map((category) =>
          action.targets[category.id] !== undefined
            ? { ...category, targetPercentage: action.targets[category.id] }
            : category,
        ),
      }));

    case "DELETE_CATEGORY":
      return withPlan(state, (plan) => {
        // "promote" removes only this category (children re-attach to its
        // parent and keep their items); "delete-subtree" removes the whole
        // subtree, applying the item behavior to every item in it.
        const removedIds = new Set(
          action.childBehavior === "delete-subtree"
            ? getSubtreeCategoryIds(plan.categories, action.categoryId)
            : [action.categoryId],
        );
        const categoriesAfterPromote =
          action.childBehavior === "promote"
            ? promoteChildrenOf(plan.categories, action.categoryId)
            : plan.categories;
        const remainingCategories = reindexSiblingGroups(
          categoriesAfterPromote.filter((category) => !removedIds.has(category.id)),
        );
        const budgetItems =
          action.behavior === "delete"
            ? plan.budgetItems.filter(
                (item) => item.categoryId === null || !removedIds.has(item.categoryId),
              )
            : plan.budgetItems.map((item) =>
                item.categoryId !== null && removedIds.has(item.categoryId)
                  ? { ...item, categoryId: null }
                  : item,
              );
        return { ...plan, categories: remainingCategories, budgetItems };
      });

    case "MOVE_CATEGORY":
      return withPlan(state, (plan) => {
        const moving = plan.categories.find(
          (category) => category.id === action.categoryId,
        );
        if (!moving) return plan;
        if ((moving.parentCategoryId ?? null) === action.newParentId) return plan;
        if (wouldCreateCycle(plan.categories, action.categoryId, action.newParentId)) {
          return plan;
        }

        const targetSiblings = plan.categories
          .filter(
            (category) =>
              (category.parentCategoryId ?? null) === action.newParentId &&
              category.id !== action.categoryId,
          )
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const insertIndex =
          action.index === undefined
            ? targetSiblings.length
            : Math.max(0, Math.min(action.index, targetSiblings.length));

        return {
          ...plan,
          categories: reindexSiblingGroups(
            plan.categories.map((category) =>
              category.id === action.categoryId
                ? {
                    ...category,
                    parentCategoryId: action.newParentId,
                    // Fractional order slots between the new siblings; the
                    // reindex pass renumbers the group densely.
                    sortOrder:
                      insertIndex === 0
                        ? (targetSiblings[0]?.sortOrder ?? 0) - 1
                        : targetSiblings[insertIndex - 1].sortOrder + 0.5,
                    updatedAt: new Date().toISOString(),
                  }
                : category,
            ),
          ),
        };
      });

    case "REORDER_CATEGORIES":
      return withPlan(state, (plan) => {
        const orderMap = new Map(
          action.orderedCategoryIds.map((id, index) => [id, index]),
        );
        return {
          ...plan,
          categories: plan.categories.map((category) =>
            (category.parentCategoryId ?? null) === action.parentId &&
            orderMap.has(category.id)
              ? { ...category, sortOrder: orderMap.get(category.id) as number }
              : category,
          ),
        };
      });

    case "ADD_BUDGET_ITEM":
      return withPlan(state, (plan) => ({
        ...plan,
        budgetItems: [...plan.budgetItems, action.item],
      }));

    case "UPDATE_BUDGET_ITEM":
      return withPlan(state, (plan) => ({
        ...plan,
        budgetItems: plan.budgetItems.map((item) =>
          item.id === action.id
            ? { ...item, label: action.label, amount: action.amount }
            : item,
        ),
      }));

    case "REMOVE_BUDGET_ITEM":
      return withPlan(state, (plan) => ({
        ...plan,
        budgetItems: plan.budgetItems.filter((item) => item.id !== action.id),
      }));

    case "MOVE_BUDGET_ITEM":
      return withPlan(state, (plan) => {
        const moving = plan.budgetItems.find((item) => item.id === action.id);
        if (!moving) return plan;

        const targetItems = plan.budgetItems
          .filter(
            (item) => item.categoryId === action.categoryId && item.id !== action.id,
          )
          .sort((a, b) => a.sortOrder - b.sortOrder);

        const insertIndex =
          action.index === undefined
            ? targetItems.length
            : Math.max(0, Math.min(action.index, targetItems.length));

        const updatedMoving: BudgetLineItem = {
          ...moving,
          categoryId: action.categoryId,
        };

        const reordered = [
          ...targetItems.slice(0, insertIndex),
          updatedMoving,
          ...targetItems.slice(insertIndex),
        ].map((item, index) => ({ ...item, sortOrder: index }));

        const reorderedIds = new Set(reordered.map((item) => item.id));

        return {
          ...plan,
          budgetItems: [
            ...plan.budgetItems.filter(
              (item) => item.id !== action.id && !reorderedIds.has(item.id),
            ),
            ...reordered,
          ],
        };
      });

    case "SET_SELECTED_CATEGORY":
      return {
        ...state,
        currentPlan: { ...state.currentPlan, selectedCategoryId: action.categoryId },
      };

    case "CLEAR_ALL":
      return {
        ...state,
        currentPlan: createDefaultPlan(),
        revision: state.revision + 1,
      };

    case "IMPORT_PLAN":
      return {
        ...state,
        currentPlan: {
          ...action.plan,
          name: action.plan.name ?? state.currentPlan.name,
        },
        revision: state.revision + 1,
      };

    case "SET_CURRENT_BUDGET_NAME":
      return withPlan(state, (plan) => ({ ...plan, name: action.name }));

    case "SAVE_CURRENT_BUDGET":
      return {
        ...state,
        currentPlan: { ...state.currentPlan, name: action.budgetName },
        savedBudgets: [action.budget, ...state.savedBudgets],
        revision: state.revision + 1,
      };

    case "LOAD_SAVED_BUDGET": {
      const budget = state.savedBudgets.find((item) => item.id === action.budgetId);
      if (!budget) return state;
      const plan = planFromSerialized(budget.data);
      plan.name = budget.name;
      return {
        ...state,
        currentPlan: plan,
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
        savedBudgets: state.savedBudgets.filter(
          (budget) => budget.id !== action.budgetId,
        ),
        revision: state.revision + 1,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface BudgetContextType {
  state: BudgetPlan;
  savedBudgets: SavedBudget[];
  isHydrated: boolean;

  // income
  addIncomeItem: (label: string, amount: number) => void;
  updateIncomeItem: (id: string, label: string, amount: number) => void;
  removeIncomeItem: (id: string) => void;

  // categories
  addCategory: (
    name: string,
    options?: { targetPercentage?: number; parentCategoryId?: string | null },
  ) => BudgetCategory;
  renameCategory: (categoryId: string, name: string) => void;
  deleteCategory: (
    categoryId: string,
    behavior: "keep" | "delete",
    childBehavior?: "promote" | "delete-subtree",
  ) => void;
  moveCategory: (
    categoryId: string,
    newParentId: string | null,
    index?: number,
  ) => boolean;
  reorderCategories: (
    parentId: string | null,
    orderedCategoryIds: string[],
  ) => void;
  updateCategoryTarget: (categoryId: string, targetPercentage: number) => void;
  setCategoryTargets: (targets: Record<string, number>) => void;

  // budget items
  addBudgetItem: (categoryId: string | null, label: string, amount: number) => void;
  updateBudgetItem: (id: string, label: string, amount: number) => void;
  removeBudgetItem: (id: string) => void;
  moveBudgetItem: (id: string, categoryId: string | null, index?: number) => void;

  // selection
  setSelectedCategory: (categoryId: string | SpecialSelectionId | null) => void;

  // totals
  getTotalIncome: () => number;
  getTotalBudgeted: () => number;
  getUnbudgetedAmount: () => number;
  getTotalForCategory: (categoryId: string | null) => number;
  getSubtreeTotalForCategory: (categoryId: string) => number;
  getEffectiveTargetForCategory: (categoryId: string) => number;

  // data ops
  clearAllData: () => void;
  importBudget: (data: AnySerializedBudget) => void;
  exportBudget: () => SerializedBudgetV4;
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
  const pendingSlicesRef = useRef({ currentPlan: false, savedBudgets: false });
  const lastPersistedRevisionRef = useRef(storeState.revision);
  const lastPersistedCurrentRef = useRef(storeState.currentPlan);
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
      !pending.currentPlan &&
      !pending.savedBudgets &&
      nextState.revision === lastPersistedRevisionRef.current
    ) {
      return;
    }

    try {
      if (pending.currentPlan) {
        window.localStorage.setItem(
          CURRENT_PLAN_STORAGE_KEY,
          JSON.stringify(toPersistedCurrentPlan(nextState.currentPlan)),
        );
        lastPersistedCurrentRef.current = nextState.currentPlan;
      }

      if (pending.savedBudgets) {
        window.localStorage.setItem(
          SAVED_PLANS_STORAGE_KEY,
          JSON.stringify(toPersistedSavedPlans(nextState.savedBudgets)),
        );
        lastPersistedSavedBudgetsRef.current = nextState.savedBudgets;
      }

      if (pending.currentPlan || pending.savedBudgets) {
        window.localStorage.setItem(
          APP_STATE_META_STORAGE_KEY,
          JSON.stringify(toPersistedMeta(nextState.revision)),
        );
      }

      pendingSlicesRef.current = { currentPlan: false, savedBudgets: false };
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
    lastPersistedCurrentRef.current = hydratedStoreState.currentPlan;
    lastPersistedSavedBudgetsRef.current = hydratedStoreState.savedBudgets;
    pendingSlicesRef.current = { currentPlan: false, savedBudgets: false };

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

    if (storeState.currentPlan !== lastPersistedCurrentRef.current) {
      pendingSlicesRef.current.currentPlan = true;
    }

    if (storeState.savedBudgets !== lastPersistedSavedBudgetsRef.current) {
      pendingSlicesRef.current.savedBudgets = true;
    }

    if (!pendingSlicesRef.current.currentPlan && !pendingSlicesRef.current.savedBudgets) {
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
      if (!incomingMeta) return;
      if (incomingMeta.revision <= latestStoreStateRef.current.revision) return;

      const incomingPlan = parsePersistedCurrentPlan(
        window.localStorage.getItem(CURRENT_PLAN_STORAGE_KEY),
      );
      if (!incomingPlan) return;

      const incomingSavedBudgets =
        parsePersistedSavedPlans(window.localStorage.getItem(SAVED_PLANS_STORAGE_KEY)) || [];

      const incomingStoreState: BudgetStoreState = {
        currentPlan: incomingPlan,
        savedBudgets: incomingSavedBudgets,
        revision: incomingMeta.revision,
      };

      if (hasPlanData(incomingStoreState.currentPlan) && !incomingStoreState.currentPlan.name) {
        incomingStoreState.currentPlan.name = generateBudgetName();
      }

      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }

      pendingSlicesRef.current = { currentPlan: false, savedBudgets: false };
      latestStoreStateRef.current = incomingStoreState;
      lastPersistedRevisionRef.current = incomingStoreState.revision;
      lastPersistedCurrentRef.current = incomingStoreState.currentPlan;
      lastPersistedSavedBudgetsRef.current = incomingStoreState.savedBudgets;
      dispatch({ type: "HYDRATE", storeState: incomingStoreState });
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isHydrated]);

  // Keep a usable default name whenever a budget has data.
  useEffect(() => {
    if (
      !hasLoadedFromStorage.current ||
      !hasPlanData(storeState.currentPlan) ||
      storeState.currentPlan.name
    ) {
      return;
    }

    dispatch({ type: "SET_CURRENT_BUDGET_NAME", name: generateBudgetName() });
  }, [storeState.currentPlan]);

  const plan = storeState.currentPlan;

  // --- income ---
  const addIncomeItem = useCallback((label: string, amount: number) => {
    dispatch({
      type: "ADD_INCOME_ITEM",
      item: {
        id: createId(),
        label,
        amount,
        sortOrder: nextIncomeSortOrder(latestStoreStateRef.current.currentPlan),
      },
    });
  }, []);

  const updateIncomeItem = useCallback((id: string, label: string, amount: number) => {
    dispatch({ type: "UPDATE_INCOME_ITEM", id, label, amount });
  }, []);

  const removeIncomeItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_INCOME_ITEM", id });
  }, []);

  // --- categories ---
  const addCategory = useCallback(
    (
      name: string,
      options?: { targetPercentage?: number; parentCategoryId?: string | null },
    ) => {
      const category = createCategory(latestStoreStateRef.current.currentPlan, name, {
        targetPercentage: options?.targetPercentage,
        parentCategoryId: options?.parentCategoryId ?? null,
      });
      dispatch({ type: "ADD_CATEGORY", category });
      return category;
    },
    [],
  );

  const renameCategory = useCallback((categoryId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: "RENAME_CATEGORY", categoryId, name: trimmed });
  }, []);

  const deleteCategory = useCallback(
    (
      categoryId: string,
      behavior: "keep" | "delete",
      childBehavior: "promote" | "delete-subtree" = "promote",
    ) => {
      dispatch({ type: "DELETE_CATEGORY", categoryId, behavior, childBehavior });
    },
    [],
  );

  const moveCategory = useCallback(
    (categoryId: string, newParentId: string | null, index?: number): boolean => {
      const categories = latestStoreStateRef.current.currentPlan.categories;
      if (wouldCreateCycle(categories, categoryId, newParentId)) return false;
      dispatch({ type: "MOVE_CATEGORY", categoryId, newParentId, index });
      return true;
    },
    [],
  );

  const reorderCategories = useCallback(
    (parentId: string | null, orderedCategoryIds: string[]) => {
      dispatch({ type: "REORDER_CATEGORIES", parentId, orderedCategoryIds });
    },
    [],
  );

  const updateCategoryTarget = useCallback(
    (categoryId: string, targetPercentage: number) => {
      dispatch({ type: "UPDATE_CATEGORY_TARGET", categoryId, targetPercentage });
    },
    [],
  );

  const setCategoryTargets = useCallback((targets: Record<string, number>) => {
    dispatch({ type: "SET_CATEGORY_TARGETS", targets });
  }, []);

  // --- budget items ---
  const addBudgetItem = useCallback(
    (categoryId: string | null, label: string, amount: number) => {
      dispatch({
        type: "ADD_BUDGET_ITEM",
        item: {
          id: createId(),
          label,
          amount,
          categoryId,
          sortOrder: nextItemSortOrder(latestStoreStateRef.current.currentPlan, categoryId),
        },
      });
    },
    [],
  );

  const updateBudgetItem = useCallback((id: string, label: string, amount: number) => {
    dispatch({ type: "UPDATE_BUDGET_ITEM", id, label, amount });
  }, []);

  const removeBudgetItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_BUDGET_ITEM", id });
  }, []);

  const moveBudgetItem = useCallback(
    (id: string, categoryId: string | null, index?: number) => {
      dispatch({ type: "MOVE_BUDGET_ITEM", id, categoryId, index });
    },
    [],
  );

  // --- selection ---
  const setSelectedCategory = useCallback(
    (categoryId: string | SpecialSelectionId | null) => {
      dispatch({ type: "SET_SELECTED_CATEGORY", categoryId });
    },
    [],
  );

  // --- totals ---
  const totalIncome = useMemo(() => selectTotalIncome(plan), [plan]);
  const totalBudgeted = useMemo(() => getTotalBudgeted(plan), [plan]);
  const unbudgetedAmount = totalIncome - totalBudgeted;

  const getTotalIncomeCb = useCallback(() => totalIncome, [totalIncome]);
  const getTotalBudgetedCb = useCallback(() => totalBudgeted, [totalBudgeted]);
  const getUnbudgetedAmountCb = useCallback(() => unbudgetedAmount, [unbudgetedAmount]);
  const getTotalForCategoryCb = useCallback(
    (categoryId: string | null) => getTotalForCategory(plan, categoryId),
    [plan],
  );
  const getSubtreeTotalForCategoryCb = useCallback(
    (categoryId: string) => getSubtreeItemTotal(plan, categoryId),
    [plan],
  );
  const getEffectiveTargetForCategoryCb = useCallback(
    (categoryId: string) => getEffectiveTarget(plan, categoryId),
    [plan],
  );

  // --- data ops ---
  const clearAllData = useCallback(() => dispatch({ type: "CLEAR_ALL" }), []);

  const importBudget = useCallback((data: AnySerializedBudget) => {
    dispatch({ type: "IMPORT_PLAN", plan: planFromSerialized(data) });
  }, []);

  const exportBudget = useCallback((): SerializedBudgetV4 => serializePlan(plan), [plan]);

  const setCurrentBudgetName = useCallback((name: string | undefined) => {
    dispatch({ type: "SET_CURRENT_BUDGET_NAME", name });
  }, []);

  const saveCurrentBudget = useCallback((name?: string): SavedBudget => {
    const current = latestStoreStateRef.current.currentPlan;
    const budgetName = getBudgetNameOrDefault(name, current.name);
    const now = new Date().toISOString();
    const budget: SavedBudget = {
      id: createId(),
      name: budgetName,
      createdAt: now,
      lastModifiedAt: now,
      data: serializePlan(current),
    };
    dispatch({ type: "SAVE_CURRENT_BUDGET", budget, budgetName });
    return budget;
  }, []);

  const loadSavedBudget = useCallback((id: string): boolean => {
    const exists = latestStoreStateRef.current.savedBudgets.some(
      (budget) => budget.id === id,
    );
    if (!exists) return false;
    dispatch({ type: "LOAD_SAVED_BUDGET", budgetId: id });
    return true;
  }, []);

  const renameSavedBudget = useCallback((id: string, newName: string): SavedBudget | null => {
    const existing = latestStoreStateRef.current.savedBudgets.find(
      (budget) => budget.id === id,
    );
    if (!existing) return null;

    const name = newName.trim();
    if (!name || name === existing.name) return existing;

    const updatedBudget: SavedBudget = {
      ...existing,
      name,
      lastModifiedAt: new Date().toISOString(),
    };
    dispatch({ type: "RENAME_SAVED_BUDGET", budget: updatedBudget });
    return updatedBudget;
  }, []);

  const deleteSavedBudget = useCallback((id: string): boolean => {
    const exists = latestStoreStateRef.current.savedBudgets.some(
      (budget) => budget.id === id,
    );
    if (!exists) return false;
    dispatch({ type: "DELETE_SAVED_BUDGET", budgetId: id });
    return true;
  }, []);

  const getSavedBudgetById = useCallback((id: string): SavedBudget | null => {
    return storeState.savedBudgets.find((budget) => budget.id === id) || null;
  }, [storeState.savedBudgets]);

  return (
    <BudgetContext.Provider
      value={{
        state: plan,
        savedBudgets: storeState.savedBudgets,
        isHydrated,
        addIncomeItem,
        updateIncomeItem,
        removeIncomeItem,
        addCategory,
        renameCategory,
        deleteCategory,
        moveCategory,
        reorderCategories,
        updateCategoryTarget,
        setCategoryTargets,
        addBudgetItem,
        updateBudgetItem,
        removeBudgetItem,
        moveBudgetItem,
        setSelectedCategory,
        getTotalIncome: getTotalIncomeCb,
        getTotalBudgeted: getTotalBudgetedCb,
        getUnbudgetedAmount: getUnbudgetedAmountCb,
        getTotalForCategory: getTotalForCategoryCb,
        getSubtreeTotalForCategory: getSubtreeTotalForCategoryCb,
        getEffectiveTargetForCategory: getEffectiveTargetForCategoryCb,
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
