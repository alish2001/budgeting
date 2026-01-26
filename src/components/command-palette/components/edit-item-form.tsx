"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { CategoryName, BudgetItem, CATEGORY_CONFIG } from "@/types/budget";
import { KeyboardShortcut } from "./keyboard-shortcut";

interface EditItemFormProps {
  category: CategoryName;
  item: BudgetItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditItemForm({ category, item, onSuccess, onCancel }: EditItemFormProps) {
  const [label, setLabel] = useState(item.label);
  const [amount, setAmount] = useState(item.amount.toString());
  const [error, setError] = useState<string | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const { updateItem } = useBudget();
  const config = CATEGORY_CONFIG[category];

  useEffect(() => {
    labelInputRef.current?.focus();
    labelInputRef.current?.select();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!label.trim()) {
      setError("Please enter a label");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    updateItem(category, {
      id: item.id,
      label: label.trim(),
      amount: parsedAmount,
    });
    onSuccess();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.12 }}
      className="p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onCancel}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h3 className="font-semibold flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          Edit {config.label} Item
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-1.5"
        >
          <label htmlFor="cmd-edit-label" className="text-xs font-medium text-muted-foreground">
            Label
          </label>
          <input
            ref={labelInputRef}
            id="cmd-edit-label"
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Rent, Groceries…"
            className="w-full h-9 px-3 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-1.5"
        >
          <label htmlFor="cmd-edit-amount" className="text-xs font-medium text-muted-foreground">
            Amount ($)
          </label>
          <input
            id="cmd-edit-amount"
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="w-full h-9 px-3 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </motion.div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between pt-2"
        >
          <button
            type="submit"
            className="h-9 px-4 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Check className="size-4" />
            Save Changes
          </button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘↵</kbd> to save
          </span>
        </motion.div>
      </form>
    </motion.div>
  );
}
