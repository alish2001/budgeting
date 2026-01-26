"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { motion } from "framer-motion";
import { Search, ArrowLeft, FolderOpen, Loader2 } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { SavedBudget } from "@/types/budget";
import { formatCurrency } from "@/lib/utils";
import { formatBudgetDate } from "@/lib/budget-storage";
import { useSavedBudgets } from "../hooks/use-saved-budgets";
import { KeyboardShortcut } from "./keyboard-shortcut";

interface SwitchBudgetViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function SwitchBudgetView({ onCancel, onSuccess }: SwitchBudgetViewProps) {
  const { importBudget, isHydrated } = useBudget();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const savedBudgets = useSavedBudgets();

  const getBudgetSummary = (budget: SavedBudget) => {
    const totalIncome = budget.data.items.income.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalItems =
      budget.data.items.needs.length +
      budget.data.items.wants.length +
      budget.data.items.savings.length +
      budget.data.items.income.length;
    return { totalIncome, totalItems };
  };

  const handleLoadBudget = (budget: SavedBudget) => {
    setLoadingId(budget.id);

    setTimeout(() => {
      importBudget(budget.data);
      setLoadingId(null);
      onSuccess();
    }, 300);
  };

  const filteredBudgets = savedBudgets.filter((budget) =>
    budget.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isHydrated) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      {/* Search Input */}
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
          placeholder="Search saved budgets…"
          className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          autoFocus
        />
        <KeyboardShortcut shortcut="ESC" />
      </div>

      {/* Budgets List */}
      <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
          {savedBudgets.length === 0
            ? "No saved budgets yet"
            : "No budgets found"}
        </Command.Empty>

        {filteredBudgets.map((budget) => {
          const { totalIncome, totalItems } = getBudgetSummary(budget);
          const isLoading = loadingId === budget.id;

          return (
            <Command.Item
              key={budget.id}
              value={`${budget.name} ${formatBudgetDate(budget.lastModifiedAt)}`}
              onSelect={() => handleLoadBudget(budget)}
              disabled={isLoading}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
            >
              <FolderOpen className="size-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{budget.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBudgetDate(budget.lastModifiedAt)} • {totalItems} items
                  • {formatCurrency(totalIncome)} income
                </p>
              </div>
              {isLoading && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
            </Command.Item>
          );
        })}
      </Command.List>
    </motion.div>
  );
}
