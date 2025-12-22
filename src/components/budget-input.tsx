"use client";

import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryName } from "@/types/budget";
import { useBudget } from "@/lib/budget-context";

interface BudgetInputProps {
  category: CategoryName;
  onClose: () => void;
}

export const BudgetInput = memo(function BudgetInput({
  category,
  onClose,
}: BudgetInputProps) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const { addItem } = useBudget();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsedAmount = parseFloat(amount);
      if (label.trim() && !isNaN(parsedAmount) && parsedAmount > 0) {
        addItem(category, label.trim(), parsedAmount);
        setLabel("");
        setAmount("");
        onClose();
      }
    },
    [addItem, amount, category, label, onClose]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 p-3 bg-muted/50 rounded-lg"
    >
      <div className="space-y-1.5">
        <Label htmlFor={`label-${category}`} className="text-xs font-medium">
          Label
        </Label>
        <Input
          id={`label-${category}`}
          type="text"
          placeholder="e.g., Rent, Groceries..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-8 text-sm"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`amount-${category}`} className="text-xs font-medium">
          Amount ($)
        </Label>
        <Input
          id={`amount-${category}`}
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-8 text-sm"
          min="0"
          step="0.01"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1 h-8 text-xs">
          Add
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
      </div>
    </form>
  );
});

