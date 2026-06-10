"use client";

import { memo, useState, useCallback, useEffect, useEffectEvent } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudget } from "@/lib/budget-context";

export type BudgetInputTarget =
  | { type: "income" }
  | { type: "category"; categoryId: string | null };

interface EditableItem {
  id: string;
  label: string;
  amount: number;
}

interface BudgetInputProps {
  target: BudgetInputTarget;
  onClose: () => void;
  item?: EditableItem; // If provided, we're editing
  placeholder?: string;
}

export const BudgetInput = memo(function BudgetInput({
  target,
  onClose,
  item,
  placeholder,
}: BudgetInputProps) {
  const [label, setLabel] = useState(item?.label || "");
  const [amount, setAmount] = useState(item?.amount.toString() || "");
  const [labelError, setLabelError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [buttonShake, setButtonShake] = useState(false);
  const {
    addIncomeItem,
    updateIncomeItem,
    addBudgetItem,
    updateBudgetItem,
  } = useBudget();
  const isEditing = !!item;
  const fieldKey = target.type === "income" ? "income" : target.categoryId ?? "unassigned";
  const labelPlaceholder =
    placeholder ?? (target.type === "income" ? "e.g., Salary…" : "e.g., Rent…");

  const syncItemToState = useEffectEvent((currentItem: EditableItem | undefined) => {
    if (currentItem) {
      setLabel(currentItem.label);
      setAmount(currentItem.amount.toString());
    }
  });

  useEffect(() => {
    syncItemToState(item);
  }, [item]);

  const validateAmount = useCallback((value: string): boolean => {
    if (!value || value.trim() === "") return false;
    const parsed = parseFloat(value);
    return !isNaN(parsed) && parsed > 0;
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const isLabelValid = label.trim().length > 0;
      const isAmountValid = validateAmount(amount);

      if (isLabelValid && isAmountValid) {
        const parsedAmount = parseFloat(amount);
        const trimmedLabel = label.trim();

        if (target.type === "income") {
          if (isEditing && item) {
            updateIncomeItem(item.id, trimmedLabel, parsedAmount);
          } else {
            addIncomeItem(trimmedLabel, parsedAmount);
          }
        } else {
          if (isEditing && item) {
            updateBudgetItem(item.id, trimmedLabel, parsedAmount);
          } else {
            addBudgetItem(target.categoryId, trimmedLabel, parsedAmount);
          }
        }

        setLabel("");
        setAmount("");
        setLabelError(false);
        setAmountError(false);
        onClose();
      } else {
        setLabelError(!isLabelValid);
        setAmountError(!isAmountValid);
        setButtonShake(true);
      }
    },
    [
      addIncomeItem,
      updateIncomeItem,
      addBudgetItem,
      updateBudgetItem,
      amount,
      target,
      label,
      onClose,
      isEditing,
      item,
      validateAmount,
    ]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(e.target.value);
      if (labelError) setLabelError(false);
    },
    [labelError]
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
      if (amountError) setAmountError(false);
    },
    [amountError]
  );

  useEffect(() => {
    if (buttonShake) {
      const timer = setTimeout(() => setButtonShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [buttonShake]);

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.12 }}
      onSubmit={handleSubmit}
      className="space-y-3 p-3 bg-muted/50 rounded-lg"
    >
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-1.5"
      >
        <Label
          htmlFor={`label-${fieldKey}-${item?.id || "new"}`}
          className="text-xs font-medium"
        >
          Label
        </Label>
        <Input
          id={`label-${fieldKey}-${item?.id || "new"}`}
          type="text"
          placeholder={labelPlaceholder}
          value={label}
          onChange={handleLabelChange}
          className="h-8 text-base"
          autoFocus
          aria-invalid={labelError}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.08 }}
        className="space-y-1.5"
      >
        <Label
          htmlFor={`amount-${fieldKey}-${item?.id || "new"}`}
          className="text-xs font-medium"
        >
          Amount ($)
        </Label>
        <Input
          id={`amount-${fieldKey}-${item?.id || "new"}`}
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={handleAmountChange}
          className="h-8 text-base"
          min="0"
          step="0.01"
          aria-invalid={amountError}
        />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        <motion.div
          animate={buttonShake ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex-1"
        >
          <Button
            type="submit"
            size="sm"
            variant={buttonShake ? "destructive" : "default"}
            className="flex-1 h-8 text-xs w-full transition-colors duration-150"
          >
            {isEditing ? "Save" : "Add"}
          </Button>
        </motion.div>
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
