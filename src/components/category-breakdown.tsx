"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useBudget } from "@/lib/budget-context";
import { CATEGORY_CONFIG } from "@/types/budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface ItemChartData {
  name: string;
  value: number;
  percentage: number;
  [key: string]: string | number;
}

// Generate distinct colors for items within a category
function generateShades(baseColor: string, count: number): string[] {
  if (count === 0) return [];

  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const shades: string[] = [];
  for (let i = 0; i < count; i++) {
    const factor = 0.4 + (0.6 * i) / Math.max(count - 1, 1);
    const newR = Math.round(r * factor + 255 * (1 - factor) * 0.3);
    const newG = Math.round(g * factor + 255 * (1 - factor) * 0.3);
    const newB = Math.round(b * factor + 255 * (1 - factor) * 0.3);
    shades.push(
      `rgb(${Math.min(255, newR)}, ${Math.min(255, newG)}, ${Math.min(
        255,
        newB
      )})`
    );
  }
  return shades;
}

export function CategoryBreakdown() {
  const {
    state,
    setSelectedCategory,
    getTotalByCategory,
    getTotalIncome,
    getUnbudgetedAmount,
  } = useBudget();

  const selectedCategory = state.selectedCategory;
  const isUnbudgeted = selectedCategory === "unbudgeted";

  // For unbudgeted, show income sources
  const config = isUnbudgeted
    ? CATEGORY_CONFIG.income
    : selectedCategory
    ? CATEGORY_CONFIG[selectedCategory]
    : null;

  const items = isUnbudgeted
    ? state.categories.income.items
    : selectedCategory
    ? state.categories[selectedCategory].items
    : [];

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

  const colors = useMemo(
    () => (config ? generateShades(config.color, items.length) : []),
    [config, items.length]
  );

  if (!selectedCategory || !config) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
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
              transition={{ delay: 0.1 }}
            >
              <CardTitle className="text-lg">
                {isUnbudgeted ? "Income Sources" : `${config.label} Breakdown`}
              </CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
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
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value, _entry, index) => {
                        const data = chartData[index];
                        return (
                          <span className="text-xs">
                            {value} ({data?.percentage.toFixed(0)}%)
                          </span>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
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
                        duration: 0.2,
                        delay: index * 0.05,
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
                            delay: 0.6 + index * 0.05,
                            type: "spring",
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
