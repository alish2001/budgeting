"use client";

import { memo, useState, useCallback, useEffect, useEffectEvent } from "react";
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
  const [labelError, setLabelError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [buttonShake, setButtonShake] = useState(false);
  const { addItem, updateItem } = useBudget();
  const isEditing = !!item;

  const syncItemToState = useEffectEvent(
    (currentItem: BudgetItem | undefined) => {
      if (currentItem) {
        setLabel(currentItem.label);
        setAmount(currentItem.amount.toString());
      }
    }
  );

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
        if (isEditing && item) {
          updateItem(category, {
            ...item,
            label: label.trim(),
            amount: parsedAmount,
          });
        } else {
          addItem(category, label.trim(), parsedAmount);
        }
        setLabel("");
        setAmount("");
        setLabelError(false);
        setAmountError(false);
        onClose();
      } else {
        // Set errors for invalid fields
        setLabelError(!isLabelValid);
        setAmountError(!isAmountValid);

        // Trigger button shake animation
        setButtonShake(true);
      }
    },
    [
      addItem,
      updateItem,
      amount,
      category,
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
      if (labelError) {
        setLabelError(false);
      }
    },
    [labelError]
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
      if (amountError) {
        setAmountError(false);
      }
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
          htmlFor={`label-${category}-${item?.id || "new"}`}
          className="text-xs font-medium"
        >
          Label
        </Label>
        <Input
          id={`label-${category}-${item?.id || "new"}`}
          type="text"
          placeholder="e.g., Rent, Groceries..."
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
          htmlFor={`amount-${category}-${item?.id || "new"}`}
          className="text-xs font-medium"
        >
          Amount ($)
        </Label>
        <Input
          id={`amount-${category}-${item?.id || "new"}`}
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
          animate={
            buttonShake
              ? {
                  x: [0, -10, 10, -10, 10, 0],
                }
              : { x: 0 }
          }
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
