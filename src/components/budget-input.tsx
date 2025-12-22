"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryName, BudgetItem } from "@/types/budget";
import { useBudget } from "@/lib/budget-context";

interface BudgetInputProps {
  category: CategoryName;
  onClose: () => void;
  item?: BudgetItem; // If provided, we're editing
}

export const BudgetInput = memo(function BudgetInput({
  category,
  onClose,
  item,
}: BudgetInputProps) {
  const [label, setLabel] = useState(item?.label || "");
  const [amount, setAmount] = useState(item?.amount.toString() || "");
  const { addItem, updateItem } = useBudget();
  const isEditing = !!item;

  useEffect(() => {
    if (item) {
      setLabel(item.label);
      setAmount(item.amount.toString());
    }
  }, [item]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsedAmount = parseFloat(amount);
      if (label.trim() && !isNaN(parsedAmount) && parsedAmount > 0) {
        if (isEditing && item) {
          updateItem(category, { ...item, label: label.trim(), amount: parsedAmount });
        } else {
          addItem(category, label.trim(), parsedAmount);
        }
        setLabel("");
        setAmount("");
        onClose();
      }
    },
    [addItem, updateItem, amount, category, label, onClose, isEditing, item]
  );

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="space-y-3 p-3 bg-muted/50 rounded-lg"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-1.5"
      >
        <Label htmlFor={`label-${category}-${item?.id || "new"}`} className="text-xs font-medium">
          Label
        </Label>
        <Input
          id={`label-${category}-${item?.id || "new"}`}
          type="text"
          placeholder="e.g., Rent, Groceries..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-8 text-sm"
          autoFocus
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        className="space-y-1.5"
      >
        <Label htmlFor={`amount-${category}-${item?.id || "new"}`} className="text-xs font-medium">
          Amount ($)
        </Label>
        <Input
          id={`amount-${category}-${item?.id || "new"}`}
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 text-sm"
          min="0"
          step="0.01"
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2"
      >
        <Button type="submit" size="sm" className="flex-1 h-8 text-xs">
          {isEditing ? "Save" : "Add"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="h-8 text-xs"
        >
          Cancel
        </Button>
      </motion.div>
    </motion.form>
  );
});

