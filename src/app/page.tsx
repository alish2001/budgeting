"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BudgetProvider, useBudget } from "@/lib/budget-context";
import { BudgetColumns } from "@/components/budget-columns";
import { BudgetPieChart } from "@/components/budget-pie-chart";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CATEGORY_CONFIG,
  CategoryName,
  SpendingCategoryName,
} from "@/types/budget";
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
import { useState, useCallback, useRef, useEffect } from "react";

function CurrentBudgetName() {
  const { state, setCurrentBudgetName, isHydrated, getTotalIncome } = useBudget();
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const totalIncome = getTotalIncome();
  const hasData = totalIncome > 0 || 
                  state.categories.needs.items.length > 0 || 
                  state.categories.wants.items.length > 0 || 
                  state.categories.savings.items.length > 0;

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

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

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
            placeholder="Enter budget name..."
            className="h-8 text-sm w-48"
          />
          <button
            onClick={handleSave}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            aria-label="Save name"
          >
            <Check className="h-4 w-4 text-green-600" />
          </button>
          <button
            onClick={handleCancel}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            aria-label="Cancel"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {state.currentBudgetName || "Unnamed Budget"}
          </span>
          <button
            onClick={() => {
              setDraftName(state.currentBudgetName || "");
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
  const { state, isHydrated, getTotalIncome } = useBudget();
  const totalIncome = getTotalIncome();
  const hasData =
    totalIncome > 0 ||
    state.categories.needs.items.length > 0 ||
    state.categories.wants.items.length > 0 ||
    state.categories.savings.items.length > 0;

  if (!isHydrated || hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.35 }}
      className="bg-card border border-border rounded-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold">
          New to Oversight?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Start a guided setup to fill Income, Needs, Wants, and Savings — then
          land back on your dashboard.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Tip: open the command menu with{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
            ⌘K
          </kbd>
          .
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
  const {
    getPercentageOfIncome,
    getTotalIncome,
    getUnbudgetedAmount,
    getTargetPercentage,
  } = useBudget();
  const totalIncome = getTotalIncome();
  const unbudgeted = getUnbudgetedAmount();

  if (totalIncome === 0) return null;

  const categories: SpendingCategoryName[] = ["needs", "wants", "savings"];
  const targetString = `${getTargetPercentage("needs")} / ${getTargetPercentage(
    "wants"
  )} / ${getTargetPercentage("savings")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="bg-card border border-border rounded-xl p-4 sm:p-6 mt-6"
    >
      <h3 className="text-sm sm:text-base font-semibold mb-4 sm:mb-6 text-muted-foreground uppercase tracking-wide">
        {targetString} Comparison (of Income)
      </h3>
      <div className="space-y-5 sm:space-y-4">
        {categories.map((category, index) => {
          const config = CATEGORY_CONFIG[category];
          const actual = getPercentageOfIncome(category);
          const target = getTargetPercentage(category);
          const diff = actual - target;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: 0.12 + index * 0.05 }}
              className="space-y-2 sm:space-y-1.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <span
                  className="text-base sm:text-sm font-semibold"
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                    <span className="text-muted-foreground">
                      Target: <strong>{target}%</strong>
                    </span>
                    <span className="hidden sm:inline text-muted-foreground">
                      •
                    </span>
                    <span className="font-semibold">
                      Actual: <strong>{actual.toFixed(1)}%</strong>
                    </span>
                  </div>
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 + index * 0.05 }}
                    className={`text-xs font-semibold px-2 py-1 rounded-md self-start ${
                      Math.abs(diff) <= 5
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : diff > 0
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff.toFixed(1)}%
                  </motion.span>
                </div>
              </div>
              <div className="relative h-4 sm:h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(actual, 100)}%` }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2 + index * 0.05,
                    ease: "easeOut",
                  }}
                  className="absolute left-0 h-full rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <div
                  className="absolute h-full w-0.5 bg-foreground/50"
                  style={{ left: `${target}%` }}
                  aria-hidden="true"
                />
              </div>
            </motion.div>
          );
        })}
        {/* Unbudgeted Income Indicator */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15, delay: 0.25 }}
          className="pt-4 border-t border-border"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <span className="text-base sm:text-sm font-semibold text-muted-foreground">
              Unbudgeted Income
            </span>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-sm font-semibold">
                {formatCurrency(unbudgeted)} (
                {totalIncome > 0
                  ? ((unbudgeted / totalIncome) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
          </div>
          <div className="relative h-4 sm:h-3 bg-muted rounded-full overflow-hidden mt-3 sm:mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min((unbudgeted / totalIncome) * 100, 100)}%`,
              }}
              transition={{
                duration: 0.5,
                delay: 0.3,
                ease: "easeOut",
              }}
              className={`absolute left-0 h-full rounded-full ${
                unbudgeted < 0
                  ? "bg-destructive"
                  : unbudgeted === 0
                  ? "bg-muted-foreground"
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
      key={state.selectedCategory || "main"}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      {state.selectedCategory ? <CategoryBreakdown /> : <BudgetPieChart />}
    </motion.div>
  );
}

function ClearButton() {
  const { clearAllData, getGrandTotal, isHydrated } = useBudget();
  const total = getGrandTotal();

  // Don't render until hydrated to avoid server/client mismatch
  if (!isHydrated || total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
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
    // Dispatch a keyboard event to trigger the command palette
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      aria-label="Open command menu"
      className="gap-1.5 text-muted-foreground hover:text-foreground h-8"
    >
      <Command className="size-3.5" />
      <span className="hidden sm:inline text-xs">Quick Actions</span>
      <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}

function BudgetDashboard() {
  const { getTargetPercentage } = useBudget();
  const targetNeeds = getTargetPercentage("needs");
  const targetWants = getTargetPercentage("wants");
  const targetSavings = getTargetPercentage("savings");
  const targetString = `${targetNeeds} / ${targetWants} / ${targetSavings}`;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Top Bar - Command Palette & Theme Toggle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex justify-end items-center gap-2 mb-4"
        >
          <CommandPaletteButton />
          <ThemeToggle />
        </motion.div>

        {/* Header */}
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
            <h1 className="text-4xl font-bold bg-linear-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent">
              <span className="block">Oversight</span>
              <span className="block">Budget Planner</span>
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Manage your money
            <br className="sm:hidden" /> with the{" "}
            <span className="font-semibold text-foreground">
              {targetString}
            </span>{" "}
            rule
          </motion.p>
          <CurrentBudgetName />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-muted-foreground text-sm"
          >
            By Ali Shariatmadari
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center justify-center gap-6 mt-4 text-sm"
          >
            {(["needs", "wants", "savings"] as CategoryName[]).map(
              (category, index) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: 0.6 + index * 0.1,
                      type: "spring",
                    }}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CATEGORY_CONFIG[category].color }}
                  />
                  <span>
                    <strong>
                      {category === "needs"
                        ? targetNeeds
                        : category === "wants"
                        ? targetWants
                        : targetSavings}
                      %
                    </strong>{" "}
                    {CATEGORY_CONFIG[category].label}
                  </span>
                </motion.div>
              )
            )}
          </motion.div>
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

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <GettingStarted />

          {/* First Row: Pie Chart and Comparison Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <ChartSection />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <BudgetComparison />
            </motion.div>
          </div>

          {/* Second Row: Income, Needs, Wants, Savings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <BudgetColumns />
          </motion.div>
        </motion.div>

        {/* Projection Card - Below categories, above target settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.65 }}
          className="mt-8"
        >
          <BudgetProjectionCard />
        </motion.div>

        {/* Target Settings - Power User Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="mt-8"
        >
          <TargetSettings />
        </motion.div>

        {/* Budget Manager - Save/Load Multiple Budgets */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mt-4"
        >
          <BudgetManager />
        </motion.div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <BudgetProvider>
      <CommandPalette />
      <BudgetDashboard />
    </BudgetProvider>
  );
}
