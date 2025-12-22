"use client";

import { motion } from "framer-motion";
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
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

function BudgetComparison() {
  const { getPercentageOfIncome, getTotalIncome, getUnbudgetedAmount } =
    useBudget();
  const totalIncome = getTotalIncome();
  const unbudgeted = getUnbudgetedAmount();

  if (totalIncome === 0) return null;

  const categories: SpendingCategoryName[] = ["needs", "wants", "savings"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card border border-border rounded-xl p-4 mt-6"
    >
      <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
        50 / 30 / 20 Comparison (of Income)
      </h3>
      <div className="space-y-4">
        {categories.map((category, index) => {
          const config = CATEGORY_CONFIG[category];
          const actual = getPercentageOfIncome(category);
          const target = config.targetPercentage;
          const diff = actual - target;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium" style={{ color: config.color }}>
                  {config.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Target: {target}% of income
                  </span>
                  <span className="font-semibold">
                    Actual: {actual.toFixed(1)}% of income
                  </span>
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
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
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(actual, 100)}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.5 + index * 0.1,
                    ease: "easeOut",
                  }}
                  className="absolute left-0 h-full rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <div
                  className="absolute h-full w-0.5 bg-foreground/50"
                  style={{ left: `${target}%` }}
                  title={`Target: ${target}%`}
                />
              </div>
            </motion.div>
          );
        })}
        {/* Unbudgeted Income Indicator */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="pt-4 border-t border-border"
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Unbudgeted Income
            </span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {formatCurrency(unbudgeted)} (
                {totalIncome > 0
                  ? ((unbudgeted / totalIncome) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min((unbudgeted / totalIncome) * 100, 100)}%`,
              }}
              transition={{
                duration: 0.8,
                delay: 0.7,
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
            <p className="text-xs text-destructive mt-1">
              You&apos;re over budget by {formatCurrency(Math.abs(unbudgeted))}
            </p>
          )}
          {unbudgeted > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
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
      transition={{ duration: 0.3 }}
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

function BudgetDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Theme Toggle - Top Right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex justify-end mb-4"
        >
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
            className="flex items-center justify-center gap-4 mb-2"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent">
              Budget Planner
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground text-lg"
          >
            Manage your money with the{" "}
            <span className="font-semibold text-foreground">50 / 30 / 20</span>{" "}
            rule
          </motion.p>
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
                      {CATEGORY_CONFIG[category].targetPercentage}%
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
            className="mt-4"
          >
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
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <BudgetProvider>
      <BudgetDashboard />
    </BudgetProvider>
  );
}
