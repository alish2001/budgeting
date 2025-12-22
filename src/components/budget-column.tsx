"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const {
    state,
    removeItem,
    getTotalByCategory,
    getPercentageByCategory,
    getTargetPercentage,
  } = useBudget();

  const config = CATEGORY_CONFIG[category];
  const items = state.categories[category].items;
  const total = getTotalByCategory(category);
  const percentage = getPercentageByCategory(category);
  const isIncome = category === "income";
  const target = !isIncome ? getTargetPercentage(category) : 0;

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
          {!isIncome && (
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: `${config.color}20`,
                color: config.color,
              }}
            >
              Target: {target}%
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold">{formatCurrency(total)}</span>
          {!isIncome && percentage > 0 && (
            <span
              className="text-sm font-medium"
              style={{
                color: percentage > target ? "#ef4444" : config.color,
              }}
            >
              ({percentage.toFixed(1)}%)
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-64">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-muted-foreground text-center py-4"
              >
                No items yet
              </motion.p>
            ) : (
              items.map((item, index) => {
                const isEditing = editingItemId === item.id;

                if (isEditing) {
                  return (
                    <motion.div
                      key={`edit-${item.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      layout
                    >
                      <BudgetInput
                        category={category}
                        item={item}
                        onClose={() => setEditingItemId(null)}
                      />
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.95 }}
                    transition={{
                      duration: 0.12,
                      delay: Math.min(index * 0.02, 0.1),
                    }}
                    layout
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-md group hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={(e) => {
                      // Don't trigger edit if clicking the remove button
                      if (
                        (e.target as HTMLElement).closest(
                          'button[aria-label*="Remove"]'
                        )
                      ) {
                        return;
                      }
                      setEditingItemId(item.id);
                    }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(category, item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity text-lg leading-none px-1"
                        aria-label={`Remove ${item.label}`}
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {isAdding || editingItemId ? null : (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.06 }}
            >
              <Button
                variant="outline"
                className="w-full mt-auto"
                onClick={() => setIsAdding(true)}
                style={{ borderColor: config.color, color: config.color }}
              >
                + Add Item
              </Button>
            </motion.div>
          )}
          {isAdding && !editingItemId && (
            <motion.div
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.1, delay: 0.02 }}
            >
              <BudgetInput
                category={category}
                onClose={() => setIsAdding(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
});
