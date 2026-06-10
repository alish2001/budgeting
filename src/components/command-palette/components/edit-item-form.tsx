"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, ArrowLeft } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { KeyboardShortcut } from "./keyboard-shortcut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaletteEditableItem } from "../types";

interface EditItemFormProps {
  itemKind: "income" | "budget";
  item: PaletteEditableItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditItemForm({ itemKind, item, onSuccess, onCancel }: EditItemFormProps) {
  const [label, setLabel] = useState(item.label);
  const [amount, setAmount] = useState(item.amount.toString());
  const [error, setError] = useState<string | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const { updateIncomeItem, updateBudgetItem } = useBudget();

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

    if (itemKind === "income") {
      updateIncomeItem(item.id, label.trim(), parsedAmount);
    } else {
      updateBudgetItem(item.id, label.trim(), parsedAmount);
    }
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
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.12 }} className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} className="rounded-md" aria-label="Go back">
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold flex items-center gap-2">Edit Item</h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="space-y-1.5">
          <Label htmlFor="cmd-edit-label" className="text-xs text-muted-foreground">Label</Label>
          <Input
            ref={labelInputRef}
            id="cmd-edit-label"
            type="text"
            value={label}
            onChange={(e) => { setLabel(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Rent, Groceries…"
            className="h-9"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }} className="space-y-1.5">
          <Label htmlFor="cmd-edit-amount" className="text-xs text-muted-foreground">Amount ($)</Label>
          <Input
            id="cmd-edit-amount"
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            min="0"
            step="0.01"
            className="h-9"
          />
        </motion.div>

        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive">{error}</motion.p>}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center justify-between pt-2">
          <Button type="submit" className="h-9 px-4">
            <Check className="size-4" />
            Save Changes
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘↵</kbd> to save
          </span>
        </motion.div>
      </form>
    </motion.div>
  );
}
