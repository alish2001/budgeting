"use client";

import { BudgetProvider, useBudget } from "@/lib/budget-context";
import { BudgetColumns } from "@/components/budget-columns";
import { BudgetPieChart } from "@/components/budget-pie-chart";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { CATEGORY_CONFIG, CategoryName } from "@/types/budget";
import { Button } from "@/components/ui/button";

function BudgetComparison() {
  const { getPercentageByCategory, getGrandTotal } = useBudget();
  const grandTotal = getGrandTotal();

  if (grandTotal === 0) return null;

  const categories: CategoryName[] = ["needs", "wants", "savings"];

  return (
    <div className="bg-card border border-border rounded-xl p-4 mt-6">
      <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
        50 / 30 / 20 Comparison
      </h3>
      <div className="space-y-4">
        {categories.map((category) => {
          const config = CATEGORY_CONFIG[category];
          const actual = getPercentageByCategory(category);
          const target = config.targetPercentage;
          const diff = actual - target;

          return (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium" style={{ color: config.color }}>
                  {config.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    Target: {target}%
                  </span>
                  <span className="font-semibold">
                    Actual: {actual.toFixed(1)}%
                  </span>
                  <span
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
                  </span>
                </div>
              </div>
              <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute left-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(actual, 100)}%`,
                    backgroundColor: config.color,
                  }}
                />
                <div
                  className="absolute h-full w-0.5 bg-foreground/50"
                  style={{ left: `${target}%` }}
                  title={`Target: ${target}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartSection() {
  const { state } = useBudget();

  return (
    <div className="space-y-4">
      {state.selectedCategory ? <CategoryBreakdown /> : <BudgetPieChart />}
      <BudgetComparison />
    </div>
  );
}

function ClearButton() {
  const { clearAllData, getGrandTotal, isHydrated } = useBudget();
  const total = getGrandTotal();

  // Don't render until hydrated to avoid server/client mismatch
  if (!isHydrated || total === 0) return null;

  return (
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
  );
}

function BudgetDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white bg-clip-text text-transparent">
              Budget Planner
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Manage your money with the{" "}
            <span className="font-semibold text-foreground">50 / 30 / 20</span>{" "}
            rule
          </p>
          <p className="text-muted-foreground text-sm">By Ali Shariatmadari</p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CATEGORY_CONFIG.needs.color }}
              />
              <span>
                <strong>50%</strong> Needs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CATEGORY_CONFIG.wants.color }}
              />
              <span>
                <strong>30%</strong> Wants
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CATEGORY_CONFIG.savings.color }}
              />
              <span>
                <strong>20%</strong> Savings
              </span>
            </div>
          </div>
          <div className="mt-4">
            <ClearButton />
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Columns */}
          <div className="lg:col-span-2">
            <BudgetColumns />
          </div>

          {/* Chart Section */}
          <div className="lg:col-span-1">
            <ChartSection />
          </div>
        </div>
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
