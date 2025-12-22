"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useBudget } from "@/lib/budget-context";
import {
  CategoryName,
  SpendingCategoryName,
  CATEGORY_CONFIG,
} from "@/types/budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ChartData {
  name: string;
  value: number;
  color: string;
  category: CategoryName | "unbudgeted";
  percentage: number;
  isUnbudgeted?: boolean;
  [key: string]: string | number | boolean | undefined;
}

const UNBUDGETED_COLOR = "#94a3b8";

export function BudgetPieChart() {
  const {
    getTotalByCategory,
    getTotalIncome,
    getUnbudgetedAmount,
    setSelectedCategory,
  } = useBudget();

  const totalIncome = getTotalIncome();
  const unbudgeted = getUnbudgetedAmount();

  const chartData: ChartData[] = useMemo(() => {
    const segments: ChartData[] = [];

    // Add spending categories (Needs, Wants, Savings)
    (["needs", "wants", "savings"] as SpendingCategoryName[]).forEach(
      (category) => {
        const total = getTotalByCategory(category);
        if (total > 0) {
          segments.push({
            name: CATEGORY_CONFIG[category].label,
            value: total,
            color: CATEGORY_CONFIG[category].color,
            category,
            percentage: totalIncome > 0 ? (total / totalIncome) * 100 : 0,
            isUnbudgeted: false,
          });
        }
      }
    );

    // Add unbudgeted income segment
    if (unbudgeted > 0 || totalIncome === 0) {
      segments.push({
        name: "Unbudgeted Income",
        value: Math.max(unbudgeted, 0),
        color: UNBUDGETED_COLOR,
        category: "income" as CategoryName,
        percentage:
          totalIncome > 0 ? (Math.max(unbudgeted, 0) / totalIncome) * 100 : 100,
        isUnbudgeted: true,
      });
    }

    return segments;
  }, [getTotalByCategory, totalIncome, unbudgeted]);

  const handleClick = (data: ChartData) => {
    if (data.isUnbudgeted) {
      setSelectedCategory("unbudgeted");
    } else {
      setSelectedCategory(data.category as CategoryName);
    }
  };

  if (totalIncome === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Budget Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-center"
            >
              Add income to see your budget breakdown
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Budget Breakdown</CardTitle>
          <div className="space-y-1">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground"
            >
              Income: {formatCurrency(totalIncome)}
            </motion.p>
            {unbudgeted >= 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-xs text-muted-foreground"
              >
                Unbudgeted: {formatCurrency(unbudgeted)} (
                {totalIncome > 0
                  ? ((unbudgeted / totalIncome) * 100).toFixed(1)
                  : 0}
                %)
              </motion.p>
            )}
            {unbudgeted < 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-xs text-destructive font-medium"
              >
                Over budget by: {formatCurrency(Math.abs(unbudgeted))}
              </motion.p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="h-72"
          >
            <ResponsiveContainer width="100%" height="100%">
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
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={entry.color}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ChartData;
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                          <p
                            className="font-medium"
                            style={{ color: data.color }}
                          >
                            {data.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(data.value)} (
                            {data.percentage.toFixed(1)}% of income)
                          </p>
                          {data.isUnbudgeted ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Available to budget
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">
                              Target:{" "}
                              {
                                CATEGORY_CONFIG[data.category as CategoryName]
                                  .targetPercentage
                              }
                              % of income
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  formatter={(value, entry) => {
                    const data = chartData.find((d) => d.name === value);
                    return (
                      <span style={{ color: entry.color }}>
                        {value} ({data?.percentage.toFixed(0)}%)
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Click a segment to see detailed breakdown
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
