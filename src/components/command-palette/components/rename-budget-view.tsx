"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Edit2, ArrowLeft, Check } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { KeyboardShortcut } from "./keyboard-shortcut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameBudgetViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function RenameBudgetView({ onCancel, onSuccess }: RenameBudgetViewProps) {
  const { state, setCurrentBudgetName, isHydrated, getTotalIncome } = useBudget();
  const [name, setName] = useState(state.currentBudgetName || "");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const totalIncome = getTotalIncome();
  const hasData = totalIncome > 0 || 
                  state.categories.needs.items.length > 0 || 
                  state.categories.wants.items.length > 0 || 
                  state.categories.savings.items.length > 0;

  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    setCurrentBudgetName(trimmed || undefined);
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

  if (!isHydrated) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.12 }}
      className="p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
          className="rounded-md"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold flex items-center gap-2">
          <Edit2 className="size-4" />
          Rename Current Budget
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      {!hasData && (
        <div className="mb-4 p-3 rounded-md bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            Add some budget items first before naming your budget.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cmd-budget-name" className="text-xs text-muted-foreground">
            Budget Name
          </Label>
          <Input
            ref={nameInputRef}
            id="cmd-budget-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., January 2025 Budget"
            className="h-9"
            disabled={!hasData}
          />
          <p className="text-xs text-muted-foreground">
            This name will be used when you save this budget.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="submit"
            disabled={!hasData}
            className="h-9 px-4"
          >
            <Check className="size-4" />
            Save Name
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘↵</kbd> to save
          </span>
        </div>
      </form>
    </motion.div>
  );
}
