# Custom Budget Categories Migration Plan

## Executive summary

Oversight currently treats the 50/30/20 budget model as a fixed data model: income plus three spending categories (`needs`, `wants`, and `savings`). The requested feature changes that foundation. The app should evolve so 50/30/20 is a default starter template, while users can add, rename, remove, reorder, and target any number of custom budget categories.

The recommended migration is to introduce a versioned, ID-based budget plan model with separate collections for income sources, budget categories, and budget line items. Budget line items should reference categories by stable IDs, and they should be able to have `categoryId: null` so deleted-category items can become unassigned instead of being silently destroyed.

## Current architecture audit

### Static type model

The current core model uses fixed category unions:

- `CategoryName = "needs" | "wants" | "savings" | "income"`
- `SpendingCategoryName = "needs" | "wants" | "savings"`
- `BudgetState.categories = Record<CategoryName, BudgetCategory>`
- `TargetPercentages = Record<SpendingCategoryName, number>`

This means TypeScript, reducers, serialization, charts, command-palette flows, and onboarding all assume exactly the same four category keys.

### Static state and persistence

The budget context creates initial state with exactly Needs, Wants, Savings, and Income. It persists a v2 localStorage payload that hardcodes those same category keys. It also computes total spending as `needs + wants + savings`, so dynamic categories cannot be added without changing central state logic.

The persistence shell itself is good and should be preserved:

- split current-budget, saved-budgets, and metadata keys
- debounced writes
- before-unload and visibility-change flushing
- cross-tab sync by revision metadata

The migration should keep that persistence strategy but bump the schema to v3.

### Static sharing/import

Sharing currently serializes fixed `items.needs`, `items.wants`, `items.savings`, and `items.income` arrays, with optional static targets. The decoder should remain backward-compatible with old shared links, but new shared payloads should serialize the dynamic v3 budget plan.

### Static dashboard and target UI

`BudgetColumns` currently renders a fixed grid of income, needs, wants, and savings. Target settings use a fixed three-category target draft and require the three values to total exactly 100.

The dynamic UI should instead render category cards from state, keep income as a separate special collection, and provide an add-category card plus an optional Unassigned card.

### Static command palette

The command palette currently has hardcoded actions for adding income, needs, wants, and savings items. It should be updated to generate category actions dynamically and add category-management flows.

### Static onboarding

Onboarding is intentionally simple and ordered around welcome, income, needs, wants, savings, and review. To avoid destabilizing onboarding, keep that flow as a 50/30/20 starter-template setup, but make it emit the new v3 plan internally.

## Proposed domain model

```ts
type BudgetPlanId = string;
type BudgetCategoryId = string;
type BudgetItemId = string;

interface BudgetPlan {
  id: BudgetPlanId;
  name?: string;
  currencyCode: "USD";
  incomeItems: IncomeItem[];
  categories: BudgetCategory[];
  budgetItems: BudgetLineItem[];
  settings: BudgetPlanSettings;
  schemaVersion: 3;
  createdAt?: string;
  updatedAt?: string;
}

interface BudgetCategory {
  id: BudgetCategoryId;
  name: string;
  targetPercentage: number;
  colorToken: string;
  sortOrder: number;
  parentCategoryId?: BudgetCategoryId | null;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BudgetLineItem {
  id: BudgetItemId;
  label: string;
  amount: number;
  categoryId: BudgetCategoryId | null;
  sortOrder: number;
  notes?: string;
  recurrence?: "monthly" | "yearly";
  createdAt?: string;
  updatedAt?: string;
}

interface IncomeItem {
  id: string;
  label: string;
  amount: number;
  sortOrder: number;
}

interface BudgetPlanSettings {
  targetTotalPercentage: number;
  unassignedBehavior: "keep" | "delete-on-category-delete";
  template?: "50-30-20" | "custom";
}
```

## Why this model

- Supports any number of user-defined categories.
- Moves budget line items by changing one `categoryId`.
- Supports orphaned/unassigned budgets with `categoryId: null`.
- Leaves room for future subcategories or “budget of budgets” with `parentCategoryId`.
- Maps cleanly to future database tables.
- Decouples income from spending categories, which keeps totals, charts, and projections cleaner.

## Category deletion UX recommendation

Do not silently delete budget line items by default. Use a confirmation dialog with choices:

1. Delete category only and move items to Unassigned.
2. Delete category and its items.
3. Cancel.

The default should be moving items to Unassigned. If MVP scope needs to be smaller, the data model should still support `categoryId: null` now so a better deletion UX can be added later without another migration.

## Implementation phases

### Phase 1: Data model and migration foundation

- Add v3 types to `src/types/budget.ts`.
- Keep legacy v2 types temporarily for migrations.
- Add `createDefaultPlan()` to seed Needs/Wants/Savings as default categories.
- Add v2-to-v3 migration utilities.
- Update localStorage parsing to read v3 first, then migrate v2 if present.
- Update saved-budget normalization to migrate old saved budgets.
- Update sharing decode to accept both v2 and v3 payloads.
- Add selectors so components stop directly accessing `state.categories.needs` and similar static paths.

### Phase 2: Dynamic category dashboard

- Refactor `BudgetColumns` to render dynamic spending categories from state.
- Keep Income as a dedicated panel/card separate from spending categories.
- Add an `AddCategoryCard`.
- Add inline category rename support.
- Add category delete confirmation.
- Add an Unassigned card when unassigned budget items exist.
- Refactor `BudgetInput` to take `categoryId` instead of `CategoryName` for spending items.

### Phase 3: Moving budgets between categories

- Add `moveBudgetItem(itemId, categoryId | null)` to context.
- Add a row-level “Move to…” menu for keyboard and screen-reader accessibility.
- Add drag-and-drop between category cards.
- Add a drop target for Unassigned.
- Add polite `aria-live` announcements for completed moves.

Recommended dependency: `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/accessibility`.

### Phase 4: Dynamic targets, charts, and projections

- Refactor target settings to iterate dynamic categories.
- Show target total warnings instead of assuming exactly three categories.
- Refactor the budget pie chart to generate one slice per category.
- Refactor category breakdown to use selected category IDs.
- Refactor future projection to iterate categories and budget items dynamically.
- Add a future-ready category `kind` later if projections need to distinguish expense, savings, debt, and investment categories.

### Phase 5: Command palette parity

Add command-palette modes for:

- Add budget category…
- Rename budget category…
- Delete budget category…
- Move budget item…
- Set category target…

Replace hardcoded Needs/Wants/Savings command generation with dynamic category lists.

### Phase 6: Onboarding stabilization

- Keep onboarding as a stable 50/30/20 starter-template flow.
- Internally convert onboarding draft data into a v3 plan on apply.
- Add review copy that tells users they can customize categories on the dashboard.
- Replace static localStorage checks with v3-aware selectors/migration helpers.

## Repository/storage abstraction for future database migration

Introduce a repository interface before adding remote storage:

```ts
interface BudgetRepository {
  loadCurrentPlan(): Promise<BudgetPlan | null>;
  saveCurrentPlan(plan: BudgetPlan, revision: number): Promise<void>;
  listSavedPlans(): Promise<SavedBudgetPlan[]>;
  savePlanSnapshot(plan: BudgetPlan, name?: string): Promise<SavedBudgetPlan>;
  loadSavedPlan(id: string): Promise<BudgetPlan | null>;
  renameSavedPlan(id: string, name: string): Promise<SavedBudgetPlan | null>;
  deleteSavedPlan(id: string): Promise<boolean>;
  subscribe?(listener: (event: BudgetRepositoryEvent) => void): () => void;
}
```

Initial implementation:

```ts
LocalStorageBudgetRepository
```

Future implementation:

```ts
RemoteBudgetRepository
```

## Future database schema direction

Potential tables:

```sql
budget_plans (
  id uuid primary key,
  user_id uuid,
  name text,
  currency_code text,
  target_total_percentage numeric,
  created_at timestamptz,
  updated_at timestamptz
);

budget_categories (
  id uuid primary key,
  plan_id uuid references budget_plans(id),
  parent_category_id uuid null references budget_categories(id),
  name text,
  target_percentage numeric,
  color_token text,
  sort_order integer,
  archived_at timestamptz null,
  created_at timestamptz,
  updated_at timestamptz
);

budget_items (
  id uuid primary key,
  plan_id uuid references budget_plans(id),
  category_id uuid null references budget_categories(id),
  label text,
  amount numeric,
  sort_order integer,
  recurrence text,
  created_at timestamptz,
  updated_at timestamptz
);

income_items (
  id uuid primary key,
  plan_id uuid references budget_plans(id),
  label text,
  amount numeric,
  sort_order integer,
  recurrence text,
  created_at timestamptz,
  updated_at timestamptz
);
```

## Suggested reducer actions

```ts
type BudgetAction =
  | { type: "HYDRATE"; storeState: BudgetStoreState }
  | { type: "ADD_INCOME_ITEM"; item: IncomeItem }
  | { type: "UPDATE_INCOME_ITEM"; item: IncomeItem }
  | { type: "REMOVE_INCOME_ITEM"; itemId: string }
  | { type: "ADD_CATEGORY"; category: BudgetCategory }
  | { type: "RENAME_CATEGORY"; categoryId: string; name: string }
  | { type: "DELETE_CATEGORY"; categoryId: string; itemBehavior: "orphan" | "delete" }
  | { type: "REORDER_CATEGORIES"; orderedCategoryIds: string[] }
  | { type: "UPDATE_CATEGORY_TARGET"; categoryId: string; targetPercentage: number }
  | { type: "ADD_BUDGET_ITEM"; item: BudgetLineItem }
  | { type: "UPDATE_BUDGET_ITEM"; item: BudgetLineItem }
  | { type: "REMOVE_BUDGET_ITEM"; itemId: string }
  | { type: "MOVE_BUDGET_ITEM"; itemId: string; categoryId: string | null; index?: number }
  | { type: "CLEAR_ALL" }
  | { type: "IMPORT_PLAN"; plan: BudgetPlan };
```

## Suggested selectors

```ts
function getBudgetCategories(plan: BudgetPlan): BudgetCategory[] {
  return [...plan.categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

function getBudgetItemsForCategory(plan: BudgetPlan, categoryId: string): BudgetLineItem[] {
  return plan.budgetItems
    .filter((item) => item.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getUnassignedBudgetItems(plan: BudgetPlan): BudgetLineItem[] {
  return plan.budgetItems.filter((item) => item.categoryId === null);
}

function getTotalBudgeted(plan: BudgetPlan): number {
  return plan.budgetItems.reduce((sum, item) => sum + item.amount, 0);
}

function getTotalByCategoryId(plan: BudgetPlan, categoryId: string): number {
  return getBudgetItemsForCategory(plan, categoryId).reduce(
    (sum, item) => sum + item.amount,
    0,
  );
}
```

## Backward compatibility strategy

### Existing localStorage

1. Try parsing v3 current plan.
2. If missing, try parsing v2 current budget.
3. Migrate v2 to v3 in memory.
4. Persist as v3 on the next mutation, or immediately after hydration if desired.

### Existing saved budgets

1. Parse v3 saved plans.
2. Parse v2 saved budgets if found.
3. Migrate each saved budget snapshot to v3.
4. Preserve saved-budget IDs, names, and timestamps.

### Existing shared links

The decoder should detect both shapes:

- v3 payloads with `version: 3` and a plan object
- legacy v2 payloads with `items.needs`, `items.wants`, `items.savings`, and `items.income`

## Product decisions to confirm before coding the full feature

1. Should deleting a category orphan or delete items by default? Recommended: orphan.
2. Should target percentages be required to total 100? Recommended: allow save with warning.
3. Should Savings remain special? Recommended: treat as a default category for now; add `category.kind` later.
4. Should Income be customizable as a category? Recommended: no, keep it separate.
5. Should onboarding allow category customization? Recommended: no, keep onboarding stable and simple initially.

## Recommended PR sequence

1. Data model and migration foundation.
2. Dynamic category dashboard.
3. Move budgets between categories with accessible drag-and-drop.
4. Dynamic targets, charts, and projections.
5. Command palette category management.
6. Onboarding v3 cleanup.
