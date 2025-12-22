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
  const { state, setSelectedCategory, getTotalByCategory } = useBudget();

  const selectedCategory = state.selectedCategory;

  if (!selectedCategory) {
    return null;
  }

  const config = CATEGORY_CONFIG[selectedCategory];
  const items = state.categories[selectedCategory].items;
  const categoryTotal = getTotalByCategory(selectedCategory);

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
    () => generateShades(config.color, items.length),
    [config.color, items.length]
  );

  return (
    <Card
      className="h-full"
      style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{config.label} Breakdown</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Total: {formatCurrency(categoryTotal)}
        </p>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground text-center">
              No items in this category
            </p>
          </div>
        ) : (
          <>
            <div className="h-64">
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
            </div>
            <div className="mt-4 space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm p-2 rounded"
                  style={{ backgroundColor: `${colors[index]}20` }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index] }}
                    />
                    <span>{item.label}</span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
