"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Edit2, ArrowLeft, Check } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { KeyboardShortcut } from "./keyboard-shortcut";

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
        <button
          onClick={onCancel}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
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
          <label htmlFor="cmd-budget-name" className="text-xs font-medium text-muted-foreground">
            Budget Name
          </label>
          <input
            ref={nameInputRef}
            id="cmd-budget-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., January 2025 Budget"
            className="w-full h-9 px-3 text-base rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
            disabled={!hasData}
          />
          <p className="text-xs text-muted-foreground">
            This name will be used when you save this budget.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={!hasData}
            className="h-9 px-4 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="size-4" />
            Save Name
          </button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘↵</kbd> to save
          </span>
        </div>
      </form>
    </motion.div>
  );
}
