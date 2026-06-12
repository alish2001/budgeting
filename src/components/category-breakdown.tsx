"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useBudget } from "@/lib/budget-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useDesignLanguage } from "@/lib/design-language-context";
import {
  getIncomeColor,
  getItemizedPalette,
  getUnassignedColor,
  resolveCategoryColor,
} from "@/lib/design-language";
import {
  getCategoryById,
  getCategoryPathLabel,
  getChildCategories,
  getItemsForCategory,
  getSortedIncomeItems,
  getSubtreeItemTotal,
} from "@/lib/budget-plan";

interface ItemChartData {
  name: string;
  value: number;
  percentage: number;
  drillId?: string;
  [key: string]: string | number | undefined;
}

function generateDistinctColors(count: number, palette: readonly string[]): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  return colors;
}

export function CategoryBreakdown() {
  const {
    state,
    setSelectedCategory,
    getTotalIncome,
    getTotalForCategory,
    getUnbudgetedAmount,
  } = useBudget();
  const { designLanguage } = useDesignLanguage();

  const selectionId = state.selectedCategoryId;
  const isIncomeView = selectionId === "income" || selectionId === "unbudgeted";
  const isUnassignedView = selectionId === "unassigned";
  const category =
    selectionId && !isIncomeView && !isUnassignedView
      ? getCategoryById(state, selectionId)
      : null;

  const title = isIncomeView
    ? "Income Sources"
    : isUnassignedView
    ? "Unassigned Breakdown"
    : category
    ? `${getCategoryPathLabel(state, category.id)} Breakdown`
    : "";

  const color = isIncomeView
    ? getIncomeColor(designLanguage)
    : isUnassignedView
    ? getUnassignedColor(designLanguage)
    : category
    ? resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage)
    : "#64748b";

  // For a category view: one entry per child category valued at its subtree
  // total (click to drill down), listed before the direct items so the
  // hierarchy reads subcategories-first.
  const items = useMemo(() => {
    if (isIncomeView) {
      return getSortedIncomeItems(state).map((item) => ({
        id: item.id,
        label: item.label,
        amount: item.amount,
        drillId: undefined as string | undefined,
      }));
    }
    if (isUnassignedView) {
      return getItemsForCategory(state, null).map((item) => ({
        id: item.id,
        label: item.label,
        amount: item.amount,
        drillId: undefined as string | undefined,
      }));
    }
    if (category) {
      return [
        ...getChildCategories(state, category.id).map((child) => ({
          id: child.id,
          label: child.name,
          amount: getSubtreeItemTotal(state, child.id),
          drillId: child.id as string | undefined,
        })),
        ...getItemsForCategory(state, category.id).map((item) => ({
          id: item.id,
          label: item.label,
          amount: item.amount,
          drillId: undefined as string | undefined,
        })),
      ];
    }
    return [];
  }, [state, isIncomeView, isUnassignedView, category]);

  const categoryTotal = isIncomeView
    ? getTotalIncome()
    : isUnassignedView
    ? getTotalForCategory(null)
    : category
    ? getSubtreeItemTotal(state, category.id)
    : 0;

  const unbudgetedAmount = getUnbudgetedAmount();

  const chartData: ItemChartData[] = useMemo(
    () =>
      items.map((item) => ({
        name: item.label,
        value: item.amount,
        percentage: categoryTotal > 0 ? (item.amount / categoryTotal) * 100 : 0,
        drillId: item.drillId,
      })),
    [items, categoryTotal],
  );

  const colors = useMemo(
    () => generateDistinctColors(items.length, getItemizedPalette(designLanguage)),
    [designLanguage, items.length],
  );

  if (!selectionId || (!isIncomeView && !isUnassignedView && !category)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <Card className="h-full" style={{ borderTopColor: color, borderTopWidth: "3px" }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
              <CardTitle className="text-lg">{title}</CardTitle>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelectedCategory(category?.parentCategoryId ?? null)
                }
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </Button>
            </motion.div>
          </div>
          <div className="space-y-1">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-sm text-muted-foreground">
              Total: {formatCurrency(categoryTotal)}
            </motion.p>
            {isIncomeView && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="text-xs text-muted-foreground">
                Unbudgeted: {formatCurrency(unbudgetedAmount)} (
                {categoryTotal > 0 ? ((unbudgetedAmount / categoryTotal) * 100).toFixed(1) : 0}%)
              </motion.p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex items-center justify-center h-64">
              <p className="text-muted-foreground text-center">No items in this category</p>
            </motion.div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.3 }} className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                      onClick={(data) => {
                        const drillId = (data as unknown as ItemChartData).drillId;
                        if (drillId) setSelectedCategory(drillId);
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index]}
                          stroke={color}
                          strokeWidth={1}
                          style={{ cursor: entry.drillId ? "pointer" : undefined }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as ItemChartData;
                          return (
                            <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(data.value)} ({data.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-4 space-y-2">
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.12, delay: index * 0.02 }}
                      layout
                    >
                      {item.drillId ? (
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(item.drillId as string)}
                          className="flex items-center justify-between text-sm p-2 rounded w-full text-left hover:brightness-95 dark:hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          style={{ backgroundColor: `${colors[index]}20` }}
                          aria-label={`View ${item.label} breakdown`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index] }} />
                            <span>{item.label}</span>
                            <span className="text-xs text-muted-foreground">subcategory ›</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </button>
                      ) : (
                        <div
                          className="flex items-center justify-between text-sm p-2 rounded"
                          style={{ backgroundColor: `${colors[index]}20` }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index] }} />
                            <span>{item.label}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
