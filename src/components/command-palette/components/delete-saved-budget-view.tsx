"use client";

import { useMemo, useState } from "react";
import { Command } from "cmdk";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  FolderOpen,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { formatBudgetDate } from "@/lib/budget-storage";
import { formatCurrency } from "@/lib/utils";
import { KeyboardShortcut } from "./keyboard-shortcut";
import { Button } from "@/components/ui/button";

interface DeleteSavedBudgetViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function DeleteSavedBudgetView({
  onCancel,
  onSuccess,
}: DeleteSavedBudgetViewProps) {
  const { savedBudgets, deleteSavedBudget, isHydrated } = useBudget();
  const [search, setSearch] = useState("");
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedBudget = useMemo(
    () => savedBudgets.find((budget) => budget.id === selectedBudgetId) || null,
    [savedBudgets, selectedBudgetId],
  );

  const filteredBudgets = savedBudgets.filter((budget) =>
    budget.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getBudgetSummary = () => {
    if (!selectedBudget) {
      return { totalIncome: 0, totalItems: 0 };
    }

    const totalIncome = selectedBudget.data.items.income.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const totalItems =
      selectedBudget.data.items.needs.length +
      selectedBudget.data.items.wants.length +
      selectedBudget.data.items.savings.length +
      selectedBudget.data.items.income.length;

    return { totalIncome, totalItems };
  };

  const handleDelete = () => {
    if (!selectedBudget || isDeleting) return;

    setIsDeleting(true);
    setTimeout(() => {
      const deleted = deleteSavedBudget(selectedBudget.id);
      setIsDeleting(false);

      if (deleted) {
        onSuccess();
      } else {
        setSelectedBudgetId(null);
      }
    }, 300);
  };

  if (!isHydrated) return null;

  if (!selectedBudget) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
      >
        <div className="flex items-center border-b border-border px-3">
          <button
            onClick={onCancel}
            className="p-1 hover:bg-muted rounded-md transition-colors mr-2"
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </button>
          <Search className="size-4 text-muted-foreground shrink-0" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Search budget to delete…"
            className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onCancel();
              }
            }}
          />
          <KeyboardShortcut shortcut="ESC" />
        </div>

        <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            {savedBudgets.length === 0 ? "No saved budgets yet" : "No budgets found"}
          </Command.Empty>

          {filteredBudgets.map((budget) => (
            <Command.Item
              key={budget.id}
              value={`${budget.name} ${formatBudgetDate(budget.lastModifiedAt)}`}
              onSelect={() => setSelectedBudgetId(budget.id)}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive"
            >
              <FolderOpen className="size-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{budget.name}</p>
                <p className="text-xs text-muted-foreground">
                  Last edited {formatBudgetDate(budget.lastModifiedAt)}
                </p>
              </div>
              <Trash2 className="size-3.5 opacity-70" />
            </Command.Item>
          ))}
        </Command.List>
      </motion.div>
    );
  }

  const summary = getBudgetSummary();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.12 }}
      className="p-4 space-y-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedBudgetId(null);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setSelectedBudgetId(null)}
          className="rounded-md"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          Delete Saved Budget
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
        <p className="text-sm font-medium truncate">{selectedBudget.name}</p>
        <p className="text-xs text-muted-foreground">
          {summary.totalItems} items • {formatCurrency(summary.totalIncome)} income
        </p>
        <p className="text-xs text-muted-foreground">
          Last edited {formatBudgetDate(selectedBudget.lastModifiedAt)}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        This deletes the saved copy only. Your currently loaded budget will stay as-is.
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setSelectedBudgetId(null)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          className="gap-2"
        >
          {isDeleting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Deleting…
            </>
          ) : (
            <>
              <Trash2 className="size-4" />
              Delete Budget
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
