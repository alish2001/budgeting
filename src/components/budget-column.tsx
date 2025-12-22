"use client";

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryName, CATEGORY_CONFIG } from "@/types/budget";
import { useBudget } from "@/lib/budget-context";
import { formatCurrency } from "@/lib/utils";
import { BudgetInput } from "./budget-input";

interface BudgetColumnProps {
  category: CategoryName;
}

export const BudgetColumn = memo(function BudgetColumn({
  category,
}: BudgetColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const { state, removeItem, getTotalByCategory, getPercentageByCategory } =
    useBudget();

  const config = CATEGORY_CONFIG[category];
  const items = state.categories[category].items;
  const total = getTotalByCategory(category);
  const percentage = getPercentageByCategory(category);

  return (
    <Card
      className="flex flex-col h-full"
      style={{ borderTopColor: config.color, borderTopWidth: "3px" }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {config.label}
          </CardTitle>
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${config.color}20`,
              color: config.color,
            }}
          >
            Target: {config.targetPercentage}%
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold">{formatCurrency(total)}</span>
          {percentage > 0 && (
            <span
              className="text-sm font-medium"
              style={{
                color:
                  percentage > config.targetPercentage
                    ? "#ef4444"
                    : config.color,
              }}
            >
              ({percentage.toFixed(1)}%)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-64">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No items yet
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-muted/30 rounded-md group hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium truncate flex-1 mr-2">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(item.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(category, item.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity text-lg leading-none px-1"
                    aria-label={`Remove ${item.label}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {isAdding ? (
          <BudgetInput category={category} onClose={() => setIsAdding(false)} />
        ) : (
          <Button
            variant="outline"
            className="w-full mt-auto"
            onClick={() => setIsAdding(true)}
            style={{ borderColor: config.color, color: config.color }}
          >
            + Add Item
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

