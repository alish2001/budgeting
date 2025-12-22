"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useBudget } from "@/lib/budget-context";
import { CategoryName, CATEGORY_CONFIG } from "@/types/budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ChartData {
  name: string;
  value: number;
  color: string;
  category: CategoryName;
  percentage: number;
  [key: string]: string | number;
}

export function BudgetPieChart() {
  const { getTotalByCategory, getGrandTotal, setSelectedCategory } =
    useBudget();

  const grandTotal = getGrandTotal();

  const chartData: ChartData[] = useMemo(() => {
    return (["needs", "wants", "savings"] as CategoryName[])
      .map((category) => {
        const total = getTotalByCategory(category);
        return {
          name: CATEGORY_CONFIG[category].label,
          value: total,
          color: CATEGORY_CONFIG[category].color,
          category,
          percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        };
      })
      .filter((item) => item.value > 0);
  }, [getTotalByCategory, grandTotal]);

  const handleClick = (data: ChartData) => {
    setSelectedCategory(data.category);
  };

  if (grandTotal === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Budget Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-center">
            Add items to see your budget breakdown
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Budget Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {formatCurrency(grandTotal)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
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
                          {data.percentage.toFixed(1)}%)
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Target:{" "}
                          {CATEGORY_CONFIG[data.category].targetPercentage}%
                        </p>
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
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Click a segment to see detailed breakdown
        </p>
      </CardContent>
    </Card>
  );
}
