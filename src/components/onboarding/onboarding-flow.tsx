"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  DollarSign,
  PiggyBank,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBudget } from "@/lib/budget-context";
import { cn, formatCurrency } from "@/lib/utils";
import type { CategoryName, SerializedBudget, SpendingCategoryName } from "@/types/budget";

type StepId = "welcome" | CategoryName | "review";

interface DraftLineItem {
  id: string;
  label: string;
  amount: number;
}

type DraftItemsByCategory = Record<CategoryName, DraftLineItem[]>;

const ORDERED_STEPS: StepId[] = [
  "welcome",
  "income",
  "needs",
  "wants",
  "savings",
  "review",
];

const STEP_LABELS: Record<StepId, string> = {
  welcome: "Welcome",
  income: "Income",
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
  review: "Review",
};

function getNextStep(step: StepId): StepId {
  const index = ORDERED_STEPS.indexOf(step);
  return ORDERED_STEPS[Math.min(index + 1, ORDERED_STEPS.length - 1)] ?? step;
}

function getPreviousStep(step: StepId): StepId {
  const index = ORDERED_STEPS.indexOf(step);
  return ORDERED_STEPS[Math.max(index - 1, 0)] ?? step;
}

function sumAmounts(items: DraftLineItem[]) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function stripIds(items: DraftLineItem[]) {
  return items.map(({ label, amount }) => ({ label, amount }));
}

function CategoryIcon({
  category,
  className,
}: {
  category: CategoryName;
  className?: string;
}) {
  switch (category) {
    case "income":
      return <Wallet className={className} aria-hidden />;
    case "needs":
      return <DollarSign className={className} aria-hidden />;
    case "wants":
      return <ShoppingBag className={className} aria-hidden />;
    case "savings":
      return <PiggyBank className={className} aria-hidden />;
    default:
      return <Wallet className={className} aria-hidden />;
  }
}

function getCategoryDescription(category: CategoryName) {
  switch (category) {
    case "income":
      return "Add what comes in each month. One source or many — keep it simple.";
    case "needs":
      return "Essentials you can’t easily skip: housing, groceries, utilities, minimum payments.";
    case "wants":
      return "Nice-to-haves: dining out, subscriptions, entertainment, travel.";
    case "savings":
      return "What you’re setting aside: emergency fund, investing, debt payoff beyond minimums.";
    default:
      return "";
  }
}

function CategoryStep({
  category,
  items,
  onChangeItems,
  totalIncome,
  targetPercentage,
  onBack,
  onNext,
  onSkip,
}: {
  category: CategoryName;
  items: DraftLineItem[];
  onChangeItems: (nextItems: DraftLineItem[]) => void;
  totalIncome: number;
  targetPercentage?: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const labelInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => sumAmounts(items), [items]);
  const targetAmount =
    targetPercentage !== undefined && totalIncome > 0
      ? (totalIncome * targetPercentage) / 100
      : null;
  const actualPercentage =
    targetPercentage !== undefined && totalIncome > 0
      ? (total / totalIncome) * 100
      : null;

  useEffect(() => {
    const isDesktop =
      window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ??
      false;
    if (!isDesktop) return;
    labelInputRef.current?.focus();
  }, [category]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setLabel("");
    setAmount("");
    setError(null);
  }, []);

  const validate = useCallback(() => {
    const trimmedLabel = label.trim();
    const numericAmount = Number(amount);

    if (!trimmedLabel) {
      setError("Add a label, like “Rent” or “Salary”.");
      labelInputRef.current?.focus();
      return null;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Add an amount greater than 0.");
      amountInputRef.current?.focus();
      return null;
    }
    return { trimmedLabel, numericAmount };
  }, [label, amount]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const validated = validate();
      if (!validated) return;

      const { trimmedLabel, numericAmount } = validated;

      if (editingId) {
        onChangeItems(
          items.map((item) =>
            item.id === editingId
              ? { ...item, label: trimmedLabel, amount: numericAmount }
              : item
          )
        );
      } else {
        const nextItem: DraftLineItem = {
          id: crypto.randomUUID(),
          label: trimmedLabel,
          amount: numericAmount,
        };
        onChangeItems([...items, nextItem]);
      }

      resetForm();
    },
    [validate, editingId, items, onChangeItems, resetForm]
  );

  const handleEdit = useCallback((item: DraftLineItem) => {
    setEditingId(item.id);
    setLabel(item.label);
    setAmount(String(item.amount));
    setError(null);
    labelInputRef.current?.focus();
  }, []);

  const handleRemove = useCallback(
    (itemId: string) => {
      onChangeItems(items.filter((item) => item.id !== itemId));
      if (editingId === itemId) resetForm();
    },
    [items, onChangeItems, editingId, resetForm]
  );

  const motionTransition = useMemo(
    () => ({
      duration: shouldReduceMotion ? 0 : 0.35,
      ease: "easeOut" as const,
    }),
    [shouldReduceMotion]
  );

  return (
    <motion.section
      key={category}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={motionTransition}
      className="w-full"
      aria-label={`${STEP_LABELS[category]} step`}
    >
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full border border-black/15">
              <CategoryIcon category={category} className="size-4" />
            </span>
            <p className="text-[11px] tracking-[0.22em] uppercase text-black/70">
              {STEP_LABELS[category]}
            </p>
          </div>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">
            {category === "income"
              ? "Let’s start with income."
              : category === "needs"
              ? "What are your needs?"
              : category === "wants"
              ? "What are your wants?"
              : "What will you save?"}
          </h2>
          <p className="mt-3 max-w-2xl text-black/70">
            {getCategoryDescription(category)}
          </p>
        </div>

        <div className="hidden sm:block text-right">
          <p className="text-[11px] tracking-[0.22em] uppercase text-black/50">
            Total
          </p>
          <p className="mt-1 font-mono tabular-nums text-lg">
            {formatCurrency(total)}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor={`${category}-label`}
                  className="text-[11px] tracking-[0.22em] uppercase text-black/60"
                >
                  Label
                </label>
                <Input
                  ref={labelInputRef}
                  id={`${category}-label`}
                  name={`${category}-label`}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={
                    category === "income"
                      ? "Salary…"
                      : category === "needs"
                      ? "Rent…"
                      : category === "wants"
                      ? "Eating out…"
                      : "Emergency fund…"
                  }
                  className="border-black/15 bg-white text-black placeholder:text-black/40"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor={`${category}-amount`}
                  className="text-[11px] tracking-[0.22em] uppercase text-black/60"
                >
                  Amount
                </label>
                <Input
                  ref={amountInputRef}
                  id={`${category}-amount`}
                  name={`${category}-amount`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="$0.00…"
                  className="border-black/15 bg-white font-mono tabular-nums text-black placeholder:text-black/40"
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min={0}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button type="submit" className="min-w-[9rem]">
                  {editingId ? "Update item" : "Add item"}
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetForm}
                    className="text-black hover:bg-black/5"
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="sm:hidden text-left">
                <p className="text-[11px] tracking-[0.22em] uppercase text-black/50">
                  Total
                </p>
                <p className="mt-1 font-mono tabular-nums text-base">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>

            <div aria-live="polite" className="min-h-5">
              {error ? (
                <p className="text-sm text-red-700">{error}</p>
              ) : null}
            </div>
          </form>

          <div className="mt-6">
            {items.length === 0 ? (
              <p className="text-sm text-black/60">
                No items yet. Add one above — you can keep going and refine
                later.
              </p>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      layout
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 py-2",
                        editingId === item.id && "border-black/25"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="truncate">{item.label}</span>
                          <span className="shrink-0 font-mono tabular-nums text-black/70">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemove(item.id)}
                        className="text-black/70 hover:bg-black/5 hover:text-black"
                        aria-label={`Remove ${item.label}`}
                      >
                        <span aria-hidden className="text-lg leading-none">
                          ×
                        </span>
                      </Button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
            The rule
          </p>
          <div className="mt-3 space-y-3 text-black/80">
            <p className="text-sm">
              Oversight starts with a calm default:{" "}
              <span className="font-semibold">50 / 30 / 20</span>.
            </p>
            <div className="space-y-1 text-sm">
              <p>
                <span className="font-semibold">Needs</span>:{" "}
                <span className="font-mono tabular-nums">50%</span>
              </p>
              <p>
                <span className="font-semibold">Wants</span>:{" "}
                <span className="font-mono tabular-nums">30%</span>
              </p>
              <p>
                <span className="font-semibold">Savings</span>:{" "}
                <span className="font-mono tabular-nums">20%</span>
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-black/10 pt-5">
            {targetPercentage === undefined ? (
              <p className="text-sm text-black/60">
                Add income first — it makes targets feel tangible.
              </p>
            ) : totalIncome === 0 ? (
              <p className="text-sm text-black/60">
                Add income to see your recommended {targetPercentage}% range.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
                    Target ({targetPercentage}%)
                  </p>
                  <p className="mt-1 font-mono tabular-nums text-lg">
                    {targetAmount ? formatCurrency(targetAmount) : "—"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-black/70">
                    <span>
                      Current:{" "}
                      <span className="font-mono tabular-nums">
                        {formatCurrency(total)}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {actualPercentage ? actualPercentage.toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          100,
                          targetAmount ? (total / targetAmount) * 100 : 0
                        )}%`,
                      }}
                      transition={{
                        duration: shouldReduceMotion ? 0 : 0.45,
                        ease: "easeOut",
                      }}
                      className="h-2 rounded-full bg-black"
                    />
                  </div>
                  <p className="text-xs text-black/55">
                    A starting point — tune targets anytime in settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <Button variant="outline" onClick={onBack} className="border-black/20">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-black hover:bg-black/5"
          >
            Skip for now
          </Button>
          <Button onClick={onNext}>
            Continue
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
      </footer>
    </motion.section>
  );
}

function ReviewStep({
  draft,
  totals,
  targets,
  budgetName,
  onBudgetNameChange,
  onBack,
  onApply,
}: {
  draft: DraftItemsByCategory;
  totals: {
    income: number;
    needs: number;
    wants: number;
    savings: number;
    spending: number;
    unbudgeted: number;
  };
  targets: Record<SpendingCategoryName, number>;
  budgetName: string;
  onBudgetNameChange: (name: string) => void;
  onBack: () => void;
  onApply: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  const breakdown: Array<{
    label: string;
    value: number;
    note: string;
  }> = useMemo(() => {
    const income = totals.income;
    const asPct = (value: number) =>
      income > 0 ? `${((value / income) * 100).toFixed(1)}%` : "—";

    return [
      {
        label: "Income",
        value: totals.income,
        note: `${draft.income.length} item${draft.income.length === 1 ? "" : "s"}`,
      },
      {
        label: `Needs (${targets.needs}%)`,
        value: totals.needs,
        note: asPct(totals.needs),
      },
      {
        label: `Wants (${targets.wants}%)`,
        value: totals.wants,
        note: asPct(totals.wants),
      },
      {
        label: `Savings (${targets.savings}%)`,
        value: totals.savings,
        note: asPct(totals.savings),
      },
    ];
  }, [draft.income.length, totals, targets]);

  return (
    <motion.section
      key="review"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeOut" }}
      className="w-full"
      aria-label="Review step"
    >
      <header className="max-w-2xl">
        <p className="text-[11px] tracking-[0.22em] uppercase text-black/70">
          Review
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight">
          Your first draft.
        </h2>
        <p className="mt-3 text-black/70">
          We’ll import this into your dashboard. You can adjust anything later.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdown.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-black/10 bg-white px-4 py-3"
              >
                <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
                  {row.label}
                </p>
                <p className="mt-1 font-mono tabular-nums text-lg">
                  {formatCurrency(row.value)}
                </p>
                <p className="mt-1 text-sm text-black/55">{row.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-black/10 bg-white px-4 py-3">
            <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
              Unbudgeted
            </p>
            <p
              className={cn(
                "mt-1 font-mono tabular-nums text-lg",
                totals.unbudgeted < 0 ? "text-red-700" : "text-black"
              )}
            >
              {formatCurrency(totals.unbudgeted)}
            </p>
            <p className="mt-1 text-sm text-black/55">
              {totals.unbudgeted < 0
                ? "You’re budgeting more than your income. That’s okay — adjust later."
                : "This becomes your buffer — or you can assign it to a category."}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
          <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
            Optional
          </p>
          <h3 className="mt-3 text-xl font-semibold">Name this budget.</h3>
          <p className="mt-2 text-sm text-black/70">
            Helpful if you save multiple versions over time.
          </p>
          <div className="mt-4 space-y-2">
            <label
              htmlFor="budget-name"
              className="text-[11px] tracking-[0.22em] uppercase text-black/60"
            >
              Budget name
            </label>
            <Input
              id="budget-name"
              name="budget-name"
              value={budgetName}
              onChange={(e) => onBudgetNameChange(e.target.value)}
              placeholder="February overview…"
              className="border-black/15 bg-white text-black placeholder:text-black/40"
              autoComplete="off"
            />
          </div>

          <div className="mt-6 rounded-xl border border-black/10 bg-white px-4 py-3">
            <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
              Why 50 / 30 / 20?
            </p>
            <p className="mt-2 text-sm text-black/70">
              It’s a gentle default that balances stability (needs), joy (wants),
              and resilience (savings). Treat it as a starting line — not a rule
              you must obey.
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-8 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <Button variant="outline" onClick={onBack} className="border-black/20">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Button>
        <Button onClick={onApply}>
          Apply to dashboard
          <Check className="size-4" aria-hidden />
        </Button>
      </footer>
    </motion.section>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { state, importBudget, isHydrated, setCurrentBudgetName } = useBudget();

  const [step, setStep] = useState<StepId>("welcome");
  const [draft, setDraft] = useState<DraftItemsByCategory>(() => ({
    income: [],
    needs: [],
    wants: [],
    savings: [],
  }));
  const [budgetName, setBudgetName] = useState("");
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  const isDirty =
    budgetName.trim().length > 0 ||
    draft.income.length > 0 ||
    draft.needs.length > 0 ||
    draft.wants.length > 0 ||
    draft.savings.length > 0;

  const hasExistingStoredBudget = useMemo(() => {
    if (!isHydrated) return false;
    try {
      const stored = localStorage.getItem("budget-planner-data");
      if (!stored) return false;
      const parsed = JSON.parse(stored);

      return (
        (parsed?.categories?.income?.items?.length ?? 0) > 0 ||
        (parsed?.categories?.needs?.items?.length ?? 0) > 0 ||
        (parsed?.categories?.wants?.items?.length ?? 0) > 0 ||
        (parsed?.categories?.savings?.items?.length ?? 0) > 0
      );
    } catch {
      return false;
    }
  }, [isHydrated]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const totals = useMemo(() => {
    const income = sumAmounts(draft.income);
    const needs = sumAmounts(draft.needs);
    const wants = sumAmounts(draft.wants);
    const savings = sumAmounts(draft.savings);
    const spending = needs + wants + savings;
    return {
      income,
      needs,
      wants,
      savings,
      spending,
      unbudgeted: income - spending,
    };
  }, [draft]);

  const existingHasDataFromState =
    state.categories.income.items.length > 0 ||
    state.categories.needs.items.length > 0 ||
    state.categories.wants.items.length > 0 ||
    state.categories.savings.items.length > 0;

  const existingHasData = existingHasDataFromState || hasExistingStoredBudget;

  const targets = useMemo(
    () => ({
      needs: state.targetPercentages.needs,
      wants: state.targetPercentages.wants,
      savings: state.targetPercentages.savings,
    }),
    [state.targetPercentages.needs, state.targetPercentages.wants, state.targetPercentages.savings]
  );

  const currentStepIndex = ORDERED_STEPS.indexOf(step);
  const progress = ORDERED_STEPS.length <= 1 ? 0 : currentStepIndex / (ORDERED_STEPS.length - 1);

  const goToStep = useCallback(
    (next: StepId) => {
      setStep(next);
      window.scrollTo({
        top: 0,
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    },
    [shouldReduceMotion]
  );

  const handleExit = useCallback(() => {
    if (isDirty) {
      setConfirmExitOpen(true);
      return;
    }
    router.push("/");
  }, [isDirty, router]);

  const applyDraftToBudget = useCallback(() => {
    const payload: SerializedBudget = {
      items: {
        income: stripIds(draft.income),
        needs: stripIds(draft.needs),
        wants: stripIds(draft.wants),
        savings: stripIds(draft.savings),
      },
      targets,
    };

    importBudget(payload);
    setCurrentBudgetName(budgetName.trim() ? budgetName.trim() : undefined);
    router.replace("/");
  }, [budgetName, draft, importBudget, router, setCurrentBudgetName, targets]);

  const handleApply = useCallback(() => {
    if (existingHasData) {
      setConfirmReplaceOpen(true);
      return;
    }
    applyDraftToBudget();
  }, [applyDraftToBudget, existingHasData]);

  const motionTransition = useMemo(
    () => ({
      duration: shouldReduceMotion ? 0 : 0.35,
      ease: "easeOut" as const,
    }),
    [shouldReduceMotion]
  );

  if (!isHydrated) return null;

  return (
    <div className="relative min-h-[100svh] bg-white text-black" style={{ colorScheme: "light" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] [background-size:72px_72px]"
      />

      <div className="relative mx-auto flex min-h-[100svh] max-w-4xl flex-col px-4 py-10 font-serif sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.22em] uppercase text-black/70">
              Oversight
            </p>
            <p className="mt-1 text-sm text-black/60">
              A serene start to your budget.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={handleExit}
            className="text-black hover:bg-black/5"
          >
            Exit
          </Button>
        </header>

        <nav className="mt-8" aria-label="Onboarding progress">
          <div className="relative h-px bg-black/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: "easeOut" }}
              className="absolute left-0 top-0 h-px bg-black"
            />
          </div>
          <ol className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ORDERED_STEPS.map((stepId, index) => {
              const isCurrent = stepId === step;
              const isComplete = index < currentStepIndex;
              const label = STEP_LABELS[stepId];

              return (
                <li key={stepId}>
                  <button
                    type="button"
                    onClick={() => goToStep(stepId)}
                    className={cn(
                      "group w-full rounded-lg border px-2 py-2 text-left transition-colors",
                      "border-black/10 bg-white hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30",
                      isCurrent && "border-black/25"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex size-5 items-center justify-center rounded-full border text-[11px] font-mono tabular-nums",
                          isComplete
                            ? "border-black bg-black text-white"
                            : "border-black/20 text-black/70"
                        )}
                        aria-hidden
                      >
                        {isComplete ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span className="truncate text-[11px] tracking-[0.18em] uppercase text-black/70">
                        {label}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className="mt-10 flex-1">
          <AnimatePresence mode="wait">
            {step === "welcome" ? (
              <motion.section
                key="welcome"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={motionTransition}
                className="w-full"
                aria-label="Welcome step"
              >
                <div className="max-w-2xl">
                  <p className="text-[11px] tracking-[0.22em] uppercase text-black/70">
                    Welcome
                  </p>
                  <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
                    Welcome to Oversight.
                  </h1>
                  <p className="mt-5 text-lg text-black/70">
                    A guided, calm setup that turns your income into a simple
                    plan:{" "}
                    <span className="font-semibold text-black">
                      50 / 30 / 20
                    </span>
                    .
                  </p>
                </div>

                <div className="mt-10 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-white p-6">
                    <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
                      What you’ll do
                    </p>
                    <ul className="mt-4 space-y-3 text-sm text-black/75">
                      <li className="flex gap-3">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-black/60" />
                        Add your income (monthly works best).
                      </li>
                      <li className="flex gap-3">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-black/60" />
                        List a few Needs and Wants.
                      </li>
                      <li className="flex gap-3">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full bg-black/60" />
                        Set a first Savings target — or skip.
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white p-6">
                    <p className="text-[11px] tracking-[0.22em] uppercase text-black/60">
                      Why it works
                    </p>
                    <p className="mt-4 text-sm text-black/70">
                      The 50 / 30 / 20 rule is a quick mental model: cover
                      essentials, leave room for joy, and build resilience. It’s
                      intentionally simple — you can customize targets later.
                    </p>
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {([
                        { label: "Needs", value: 50 },
                        { label: "Wants", value: 30 },
                        { label: "Savings", value: 20 },
                      ] as const).map((pill) => (
                        <div
                          key={pill.label}
                          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-center"
                        >
                          <p className="font-mono tabular-nums text-lg">
                            {pill.value}%
                          </p>
                          <p className="text-[11px] tracking-[0.18em] uppercase text-black/60">
                            {pill.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <footer className="mt-10 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                  <Button
                    asChild
                    variant="outline"
                    className="border-black/20"
                  >
                    <Link href="/">Skip and use dashboard</Link>
                  </Button>
                  <Button onClick={() => goToStep("income")}>
                    Begin setup
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </footer>
              </motion.section>
            ) : step === "review" ? (
              <ReviewStep
                draft={draft}
                totals={totals}
                targets={targets}
                budgetName={budgetName}
                onBudgetNameChange={setBudgetName}
                onBack={() => goToStep(getPreviousStep(step))}
                onApply={handleApply}
              />
            ) : (
              <CategoryStep
                category={step}
                items={draft[step]}
                onChangeItems={(nextItems) =>
                  setDraft((prev) => ({ ...prev, [step]: nextItems }))
                }
                totalIncome={totals.income}
                targetPercentage={
                  step === "income" ? undefined : targets[step as SpendingCategoryName]
                }
                onBack={() => goToStep(getPreviousStep(step))}
                onNext={() => goToStep(getNextStep(step))}
                onSkip={() => goToStep(getNextStep(step))}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Replace existing budget confirmation */}
        <Dialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
          <DialogContent className="font-sans" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Replace your current budget?</DialogTitle>
              <DialogDescription>
                Applying onboarding will replace your current Income, Needs,
                Wants, and Savings items on the dashboard.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmReplaceOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmReplaceOpen(false);
                  applyDraftToBudget();
                }}
              >
                Replace and continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Exit confirmation */}
        <Dialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
          <DialogContent className="font-sans" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Discard setup?</DialogTitle>
              <DialogDescription>
                Your onboarding draft isn’t saved until you apply it to the
                dashboard.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmExitOpen(false)}>
                Keep going
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmExitOpen(false);
                  router.push("/");
                }}
              >
                Discard and exit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
