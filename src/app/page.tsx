"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BudgetProvider,
  readStoredPlanHasData,
  useBudget,
} from "@/lib/budget-context";
import { BudgetColumns } from "@/components/budget-columns";
import { BudgetPieChart } from "@/components/budget-pie-chart";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { TargetSettings } from "@/components/target-settings";
import { ShareBudgetDialog } from "@/components/share-budget-dialog";
import { ImportBudgetDialog } from "@/components/import-budget-dialog";
import { BudgetManager } from "@/components/budget-manager";
import { CommandPalette } from "@/components/command-palette";
import { BudgetProjectionCard } from "@/components/budget-projection-card";
import { Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "react";
import { useDesignLanguage } from "@/lib/design-language-context";
import { resolveCategoryColor } from "@/lib/design-language";
import {
  getEffectiveTarget,
  getTopLevelCategories,
  hasPlanData,
} from "@/lib/budget-plan";
import { hasSkippedOnboarding } from "@/lib/onboarding-gate";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useIsHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function CurrentBudgetName() {
  const { state, setCurrentBudgetName, isHydrated } = useBudget();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasData = hasPlanData(state);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    const trimmed = draftName.trim();
    setCurrentBudgetName(trimmed || undefined);
    setIsEditing(false);
  }, [draftName, setCurrentBudgetName]);

  const handleCancel = useCallback(() => setIsEditing(false), []);

  if (!isHydrated || !hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.5 }}
      className="flex items-center justify-center gap-2 mb-2"
    >
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            placeholder="Enter budget name…"
            className="h-8 text-sm w-48"
          />
          <button onClick={handleSave} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors" aria-label="Save name">
            <Check className="h-4 w-4 text-green-600" />
          </button>
          <button onClick={handleCancel} className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors" aria-label="Cancel">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {state.name || "Budget"}
          </span>
          <button
            onClick={() => {
              setDraftName(state.name || "");
              setIsEditing(true);
            }}
            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            aria-label="Rename budget"
          >
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

function GettingStarted() {
  const { state, isHydrated } = useBudget();
  const hasData = hasPlanData(state);

  if (!isHydrated || hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.35 }}
      className="bg-card border border-border rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold">New to Oversight?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Start a guided setup to fill in your income and categories — then land
          back on your dashboard, where you can add, rename, or reorganize
          categories any time.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Tip: open the command menu with{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd>.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild>
          <Link href="/onboarding">Start onboarding</Link>
        </Button>
      </div>
    </motion.div>
  );
}

function BudgetComparison() {
  const { state, getTotalIncome, getSubtreeTotalForCategory, getUnbudgetedAmount } =
    useBudget();
  const { designLanguage } = useDesignLanguage();
  const isDelight = designLanguage === "delight";
  const totalIncome = getTotalIncome();
  const unbudgeted = getUnbudgetedAmount();
  const categories = getTopLevelCategories(state);

  if (totalIncome === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="bg-card border border-border rounded-xl p-4 sm:p-6 mt-6"
    >
      <h3 className="text-sm sm:text-base font-semibold mb-4 sm:mb-6 text-muted-foreground uppercase tracking-wide">
        Target vs Actual (of Income)
      </h3>
      <div className="space-y-5 sm:space-y-4">
        {categories.map((category, index) => {
          const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
          const total = getSubtreeTotalForCategory(category.id);
          const actual = totalIncome > 0 ? (total / totalIncome) * 100 : 0;
          const target = getEffectiveTarget(state, category.id);
          const diff = actual - target;
          const diffBadgeClass = isDelight
            ? Math.abs(diff) <= 5
              ? "bg-emerald-100/75 text-emerald-900 dark:bg-emerald-900/45 dark:text-emerald-200"
              : diff > 0
              ? "bg-rose-100/75 text-rose-900 dark:bg-rose-900/45 dark:text-rose-200"
              : "bg-sky-100/75 text-sky-900 dark:bg-sky-900/45 dark:text-sky-200"
            : Math.abs(diff) <= 5
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : diff > 0
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: 0.12 + index * 0.05 }}
              className="space-y-2 sm:space-y-1.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span className={cn("text-base sm:text-sm font-semibold truncate", isDelight && "tracking-wide")} style={{ color }}>
                  {category.name}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Target: <strong>{target}%</strong>
                    </span>
                    <span className="hidden sm:inline text-muted-foreground">•</span>
                    <span className="font-semibold">
                      Actual: <strong>{actual.toFixed(1)}%</strong>
                    </span>
                  </div>
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                    className={cn("text-xs font-semibold px-2 py-1 rounded-md self-start", diffBadgeClass)}
                  >
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                  </motion.span>
                </div>
              </div>
              <div className="relative h-4 sm:h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(actual, 100)}%` }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.05, ease: "easeOut" }}
                  className="absolute left-0 h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
                <div className="absolute h-full w-0.5 bg-foreground/50" style={{ left: `${Math.min(target, 100)}%` }} aria-hidden="true" />
              </div>
            </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15, delay: 0.25 }}
          className="pt-4 border-t border-border"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <span className="text-base sm:text-sm font-semibold text-muted-foreground">Unbudgeted Income</span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-sm font-semibold">
                {formatCurrency(unbudgeted)} (
                {totalIncome > 0 ? ((unbudgeted / totalIncome) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
          <div className="relative h-4 sm:h-3 bg-muted rounded-full overflow-hidden mt-3 sm:mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((unbudgeted / totalIncome) * 100, 100)}%` }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              className={`absolute left-0 h-full rounded-full ${
                unbudgeted < 0
                  ? "bg-destructive"
                  : unbudgeted === 0
                  ? "bg-muted-foreground"
                  : isDelight
                  ? "bg-slate-500/70 dark:bg-slate-300/70"
                  : "bg-slate-400"
              }`}
            />
          </div>
          {unbudgeted < 0 && (
            <p className="text-sm sm:text-xs text-destructive mt-2 sm:mt-1">
              You&apos;re over budget by {formatCurrency(Math.abs(unbudgeted))}
            </p>
          )}
          {unbudgeted > 0 && (
            <p className="text-sm sm:text-xs text-muted-foreground mt-2 sm:mt-1">
              {formatCurrency(unbudgeted)} still available to budget
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function ChartSection() {
  const { state } = useBudget();

  return (
    <motion.div
      key={state.selectedCategoryId || "main"}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {state.selectedCategoryId ? <CategoryBreakdown /> : <BudgetPieChart />}
    </motion.div>
  );
}

function ClearButton() {
  const { clearAllData, getTotalBudgeted, getTotalIncome, isHydrated } = useBudget();
  const total = getTotalBudgeted() + getTotalIncome();

  if (!isHydrated || total === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (confirm("Are you sure you want to clear all budget data?")) {
            clearAllData();
          }
        }}
        className="text-muted-foreground hover:text-destructive"
      >
        Clear All
      </Button>
    </motion.div>
  );
}

function CommandPaletteButton() {
  const handleClick = () => {
    const event = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
    document.dispatchEvent(event);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} aria-label="Open command menu" className="gap-1.5 text-muted-foreground hover:text-foreground h-8">
      <Command className="size-3.5" />
      <span className="hidden sm:inline text-xs">Quick Actions</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}

function BudgetDashboard() {
  const { state } = useBudget();
  const { designLanguage } = useDesignLanguage();
  const isDelight = designLanguage === "delight";
  const categories = getTopLevelCategories(state);

  return (
    <div
      className={cn(
        "min-h-screen",
        isDelight
          ? "bg-background delight-grid-background"
          : "bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      )}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex justify-end items-center gap-2 mb-4"
        >
          <CommandPaletteButton />
          <ThemeToggle />
        </motion.div>

        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col items-center justify-center gap-1 mb-2"
          >
            <h1
              className={cn(
                "text-4xl",
                isDelight
                  ? "delight-serif-display font-semibold sm:text-5xl text-foreground"
                  : "font-bold bg-linear-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent"
              )}
            >
              <span className="block">Oversight</span>
              <span className="block">Budget Planner</span>
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn("text-lg", isDelight ? "text-foreground/75 delight-serif-display" : "text-muted-foreground")}
          >
            Manage your money
            <br className="sm:hidden" /> with budgets that fit{" "}
            <span className="font-semibold text-foreground">your life</span>
          </motion.p>
          <CurrentBudgetName />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={cn("text-sm", isDelight ? "delight-meta" : "text-muted-foreground")}
          >
            By Ali Shariatmadari
          </motion.p>
          {categories.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 text-sm"
            >
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 + index * 0.1, type: "spring" }}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage) }}
                  />
                  <span>
                    <strong>{getEffectiveTarget(state, category.id)}%</strong> {category.name}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex items-center justify-center gap-2 mt-4"
          >
            <ShareBudgetDialog />
            <ImportBudgetDialog />
            <ClearButton />
          </motion.div>
        </motion.header>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-6">
          <GettingStarted />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <ChartSection />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <BudgetComparison />
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
            <BudgetColumns />
          </motion.div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.65 }} className="mt-8">
          <BudgetProjectionCard />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }} className="mt-8">
          <TargetSettings />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.8 }} className="mt-4">
          <BudgetManager />
        </motion.div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const isHydrated = useIsHydrated();
  const hasShareCode = isHydrated
    ? new URLSearchParams(window.location.search).has("budget")
    : false;
  const hasExistingData = isHydrated ? readStoredPlanHasData() : false;
  const skippedOnboarding = isHydrated ? hasSkippedOnboarding() : false;
  const shouldRedirectToOnboarding =
    isHydrated && !hasShareCode && !hasExistingData && !skippedOnboarding;

  useEffect(() => {
    if (!shouldRedirectToOnboarding) return;
    router.replace("/onboarding");
  }, [router, shouldRedirectToOnboarding]);

  if (!isHydrated || shouldRedirectToOnboarding) return null;

  return (
    <BudgetProvider>
      <CommandPalette />
      <BudgetDashboard />
    </BudgetProvider>
  );
}
