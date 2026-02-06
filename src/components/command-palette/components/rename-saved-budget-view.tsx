"use client";

import { useMemo, useState } from "react";
import { Command } from "cmdk";
import { motion } from "framer-motion";
import { ArrowLeft, Edit2, FolderOpen, Loader2, Search } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { formatBudgetDate } from "@/lib/budget-storage";
import { KeyboardShortcut } from "./keyboard-shortcut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameSavedBudgetViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function RenameSavedBudgetView({
  onCancel,
  onSuccess,
}: RenameSavedBudgetViewProps) {
  const { savedBudgets, renameSavedBudget, isHydrated } = useBudget();
  const [search, setSearch] = useState("");
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedBudget = useMemo(
    () => savedBudgets.find((budget) => budget.id === selectedBudgetId) || null,
    [savedBudgets, selectedBudgetId],
  );

  const filteredBudgets = savedBudgets.filter((budget) =>
    budget.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleBudgetSelect = (budgetId: string) => {
    const budget = savedBudgets.find((item) => item.id === budgetId);
    if (!budget) return;
    setSelectedBudgetId(budget.id);
    setName(budget.name);
    setSearch("");
  };

  const handleRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedBudget || !name.trim() || isSaving) return;

    setIsSaving(true);
    setTimeout(() => {
      const renamed = renameSavedBudget(selectedBudget.id, name.trim());
      setIsSaving(false);

      if (renamed) {
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
            placeholder="Search budget to rename…"
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
              onSelect={() => handleBudgetSelect(budget.id)}
              className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
            >
              <FolderOpen className="size-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{budget.name}</p>
                <p className="text-xs text-muted-foreground">
                  Last edited {formatBudgetDate(budget.lastModifiedAt)}
                </p>
              </div>
              <Edit2 className="size-3.5 text-muted-foreground" />
            </Command.Item>
          ))}
        </Command.List>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.12 }}
      className="p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setSelectedBudgetId(null);
        }
      }}
    >
      <div className="flex items-center gap-2 mb-4">
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
        <h3 className="font-semibold flex items-center gap-2">
          <Edit2 className="size-4" />
          Rename Saved Budget
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      <form onSubmit={handleRename} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cmd-rename-saved-budget" className="text-xs text-muted-foreground">
            New Name
          </Label>
          <Input
            id="cmd-rename-saved-budget"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., February 2026 Budget…"
            className="h-9"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setSelectedBudgetId(null);
              } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                handleRename();
              }
            }}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button type="submit" disabled={!name.trim() || isSaving} className="h-9 px-4 gap-2">
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Renaming…
              </>
            ) : (
              <>
                <Edit2 className="size-4" />
                Rename
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘↵</kbd> to rename
          </span>
        </div>
      </form>
    </motion.div>
  );
}
