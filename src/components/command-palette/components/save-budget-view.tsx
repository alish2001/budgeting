"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Save } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { generateBudgetName } from "@/lib/budget-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyboardShortcut } from "./keyboard-shortcut";

interface SaveBudgetViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function SaveBudgetView({ onCancel, onSuccess }: SaveBudgetViewProps) {
  const { state, saveCurrentBudget, isHydrated, getTotalIncome } = useBudget();
  const [name, setName] = useState(state.currentBudgetName || "");
  const [isSaving, setIsSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const defaultName = useMemo(() => generateBudgetName(), []);

  const totalIncome = getTotalIncome();
  const hasData =
    totalIncome > 0 ||
    state.categories.needs.items.length > 0 ||
    state.categories.wants.items.length > 0 ||
    state.categories.savings.items.length > 0;

  useEffect(() => {
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hasData || isSaving) return;

    setIsSaving(true);
    const trimmed = name.trim();
    const nextName = trimmed || state.currentBudgetName || defaultName;
    saveCurrentBudget(nextName);
    setTimeout(() => {
      setIsSaving(false);
      onSuccess();
    }, 300);
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
          <Save className="size-4" />
          Save Current Budget
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      {!hasData && (
        <div className="mb-4 p-3 rounded-md bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            Add some budget items first before saving.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cmd-save-budget-name" className="text-xs text-muted-foreground">
            Budget Name
          </Label>
          <Input
            ref={nameInputRef}
            id="cmd-save-budget-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., January 2025 Budget…"
            className="h-9"
            disabled={!hasData || isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to use “{defaultName}”.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="submit"
            disabled={!hasData || isSaving}
            className="h-9 px-4 gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Save Budget
              </>
            ) : (
              <>
                <Check className="size-4" />
                Save Budget
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘↵</kbd> to save
          </span>
        </div>
      </form>
    </motion.div>
  );
}
