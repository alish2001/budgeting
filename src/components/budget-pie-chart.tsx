"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useBudget } from "@/lib/budget-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useDesignLanguage } from "@/lib/design-language-context";
import { getUnassignedColor, resolveCategoryColor } from "@/lib/design-language";
import {
  getSortedCategories,
  getTotalForCategory,
  getUnassignedItems,
} from "@/lib/budget-plan";

interface ChartData {
  name: string;
  value: number;
  color: string;
  selectionId: string;
  percentage: number;
  target?: number;
  isUnbudgeted?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export function BudgetPieChart() {
  const { state, getTotalIncome, getUnbudgetedAmount, setSelectedCategory } =
    useBudget();
  const { designLanguage } = useDesignLanguage();

  const totalIncome = getTotalIncome();
  const unbudgeted = getUnbudgetedAmount();
  const unbudgetedColor = getUnassignedColor(designLanguage);

  const chartData: ChartData[] = useMemo(() => {
    const segments: ChartData[] = [];

    for (const category of getSortedCategories(state)) {
      const total = getTotalForCategory(state, category.id);
      if (total > 0) {
        segments.push({
          name: category.name,
          value: total,
          color: resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage),
          selectionId: category.id,
          target: category.targetPercentage,
          percentage: totalIncome > 0 ? (total / totalIncome) * 100 : 0,
          isUnbudgeted: false,
        });
      }
    }

    const unassignedTotal = getUnassignedItems(state).reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    if (unassignedTotal > 0) {
      segments.push({
        name: "Unassigned",
        value: unassignedTotal,
        color: unbudgetedColor,
        selectionId: "unassigned",
        percentage: totalIncome > 0 ? (unassignedTotal / totalIncome) * 100 : 0,
        isUnbudgeted: false,
      });
    }

    if (unbudgeted > 0 || totalIncome === 0) {
      segments.push({
        name: "Unbudgeted Income",
        value: Math.max(unbudgeted, 0),
        color: unbudgetedColor,
        selectionId: "unbudgeted",
        percentage:
          totalIncome > 0 ? (Math.max(unbudgeted, 0) / totalIncome) * 100 : 100,
        isUnbudgeted: true,
      });
    }

    return segments;
  }, [state, designLanguage, totalIncome, unbudgeted, unbudgetedColor]);

  const handleClick = (data: ChartData) => {
    setSelectedCategory(data.selectionId as never);
  };

  if (totalIncome === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Budget Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-muted-foreground text-center">
              Add income to see your budget breakdown
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15 }}>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Budget Breakdown</CardTitle>
          <div className="space-y-1">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="text-sm text-muted-foreground">
              Income: {formatCurrency(totalIncome)}
            </motion.p>
            {unbudgeted >= 0 ? (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-xs text-muted-foreground">
                Unbudgeted: {formatCurrency(unbudgeted)} (
                {totalIncome > 0 ? ((unbudgeted / totalIncome) * 100).toFixed(1) : 0}%)
              </motion.p>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-xs text-destructive font-medium">
                Over budget by: {formatCurrency(Math.abs(unbudgeted))}
              </motion.p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, delay: 0.1 }} className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  onClick={handleClick}
                  style={{ cursor: "pointer" }}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartData;
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                          <p className="font-medium" style={{ color: data.color }}>
                            {data.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(data.value)} ({data.percentage.toFixed(1)}% of income)
                          </p>
                          {data.isUnbudgeted ? (
                            <p className="text-xs text-muted-foreground mt-1">Available to budget</p>
                          ) : data.target !== undefined ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Target: {data.target}% of income
                            </p>
                          ) : null}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="mt-4"
            role="list"
            aria-label="Budget categories"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {chartData.map((entry, index) => (
                <motion.button
                  key={`legend-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: 0.2 + index * 0.05 }}
                  className="flex items-center gap-2 sm:gap-2.5 text-sm text-left w-full p-1.5 rounded-md hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => handleClick(entry)}
                  aria-label={`View ${entry.name} breakdown: ${formatCurrency(entry.value)}, ${entry.percentage.toFixed(0)}% of income`}
                >
                  <div className="w-3 h-3 sm:w-2.5 sm:h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                  <span className="font-medium truncate" style={{ color: entry.color }}>
                    {entry.name}
                  </span>
                  <span className="text-muted-foreground ml-auto shrink-0">({entry.percentage.toFixed(0)}%)</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
          <p className="text-xs text-center text-muted-foreground mt-3 sm:mt-2">
            Click a segment to see detailed breakdown
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
