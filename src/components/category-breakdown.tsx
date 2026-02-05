"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useBudget } from "@/lib/budget-context";
import { CATEGORY_CONFIG } from "@/types/budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useDesignLanguage } from "@/lib/design-language-context";
import { getCategoryColor } from "@/lib/design-language";

interface ItemChartData {
  name: string;
  value: number;
  percentage: number;
  [key: string]: string | number;
}

// Distinct color palette for category breakdowns
// These colors are chosen to be visually distinct and work well together
const BREAKDOWN_COLORS_BY_LANGUAGE = {
  cyberpunk: [
    "#ef4444", // Red
    "#3b82f6", // Blue
    "#22c55e", // Green
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#a855f7", // Violet
    "#eab308", // Yellow
    "#10b981", // Emerald
    "#f43f5e", // Rose
  ],
  delight: [
    "#c8887f", // Clay rose
    "#7f9fc8", // Dusty blue
    "#79ae90", // Sage
    "#c8aa82", // Sand
    "#a893c9", // Lilac
    "#b78aa8", // Mauve
    "#7eaab4", // Soft teal
    "#9ab883", // Olive
    "#be9378", // Terracotta
    "#8da2c0", // Powder indigo
    "#76a79d", // Seafoam
    "#a989b9", // Pastel violet
    "#b9af7e", // Mustard mist
    "#7ba994", // Muted emerald
    "#b78590", // Rosewood
  ],
} as const;

// Generate distinct colors for items within a category
// Uses a diverse color palette instead of shades of the same color
function generateDistinctColors(count: number, palette: readonly string[]): string[] {
  if (count === 0) return [];

  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    // Cycle through the color palette, ensuring good distribution
    const colorIndex = i % palette.length;
    colors.push(palette[colorIndex]);
  }
  return colors;
}

export function CategoryBreakdown() {
  const {
    state,
    setSelectedCategory,
    getTotalByCategory,
    getTotalIncome,
    getUnbudgetedAmount,
  } = useBudget();
  const { designLanguage } = useDesignLanguage();

  const selectedCategory = state.selectedCategory;
  const isUnbudgeted = selectedCategory === "unbudgeted";

  // For unbudgeted, show income sources
  const config = isUnbudgeted
    ? {
        ...CATEGORY_CONFIG.income,
        color: getCategoryColor("income", designLanguage),
      }
    : selectedCategory
    ? {
        ...CATEGORY_CONFIG[selectedCategory],
        color: getCategoryColor(selectedCategory, designLanguage),
      }
    : null;

  // Memoize items to prevent dependency changes on every render
  const items = useMemo(() => {
    if (isUnbudgeted) {
      return state.categories.income.items;
    }
    if (selectedCategory) {
      return state.categories[selectedCategory].items;
    }
    return [];
  }, [isUnbudgeted, selectedCategory, state.categories]);

  const categoryTotal = isUnbudgeted
    ? getTotalIncome()
    : selectedCategory
    ? getTotalByCategory(selectedCategory)
    : 0;

  const unbudgetedAmount = getUnbudgetedAmount();

  const chartData: ItemChartData[] = useMemo(
    () =>
      items.map((item) => ({
        name: item.label,
        value: item.amount,
        percentage: categoryTotal > 0 ? (item.amount / categoryTotal) * 100 : 0,
      })),
    [items, categoryTotal]
  );

  const colors = useMemo(() => {
    const palette = BREAKDOWN_COLORS_BY_LANGUAGE[designLanguage];
    return generateDistinctColors(items.length, palette);
  }, [designLanguage, items.length]);

  if (!selectedCategory || !config) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <Card
        className="h-full"
        style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <CardTitle className="text-lg">
                {isUnbudgeted ? "Income Sources" : `${config.label} Breakdown`}
              </CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Back
              </Button>
            </motion.div>
          </div>
          <div className="space-y-1">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground"
            >
              Total: {formatCurrency(categoryTotal)}
            </motion.p>
            {isUnbudgeted && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-xs text-muted-foreground"
              >
                Unbudgeted: {formatCurrency(unbudgetedAmount)} (
                {categoryTotal > 0
                  ? ((unbudgetedAmount / categoryTotal) * 100).toFixed(1)
                  : 0}
                %)
              </motion.p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center h-64"
            >
              <p className="text-muted-foreground text-center">
                No items in this category
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="h-64"
              >
                <ResponsiveContainer width="100%" height="100%">
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
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={colors[index]}
                          stroke={config.color}
                          strokeWidth={1}
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
                                {formatCurrency(data.value)} (
                                {data.percentage.toFixed(1)}%)
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
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-4 space-y-2"
              >
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{
                        duration: 0.12,
                        delay: index * 0.02,
                      }}
                      layout
                      className="flex items-center justify-between text-sm p-2 rounded"
                      style={{ backgroundColor: `${colors[index]}20` }}
                    >
                      <div className="flex items-center gap-2">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            delay: 0.15 + index * 0.02,
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[index] }}
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(item.amount)}
                      </span>
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
