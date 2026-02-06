"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudget } from "@/lib/budget-context";
import { formatBudgetDate, generateBudgetName } from "@/lib/budget-storage";
import { SavedBudget, SerializedBudget } from "@/types/budget";
import { formatCurrency } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Save,
  Trash2,
  Edit2,
  Check,
  X,
  FolderOpen,
  Loader2,
} from "lucide-react";

export function BudgetManager() {
  const {
    state,
    savedBudgets,
    loadSavedBudget,
    saveCurrentBudget,
    renameSavedBudget,
    deleteSavedBudget,
    isHydrated,
    getTotalIncome,
  } = useBudget();
  const [isOpen, setIsOpen] = useState(false);
  const saveNameInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const totalIncome = getTotalIncome();
  const hasCurrentBudget =
    totalIncome > 0 ||
    state.categories.needs.items.length > 0 ||
    state.categories.wants.items.length > 0 ||
    state.categories.savings.items.length > 0;

  const handleSaveBudget = useCallback(() => {
    if (isSaving || !hasCurrentBudget) return;

    setIsSaving(true);

    setTimeout(() => {
      const inputName = saveNameInputRef.current?.value ?? "";
      const name =
        inputName.trim() || state.currentBudgetName || generateBudgetName();
      saveCurrentBudget(name);
      setIsSaving(false);
      setShowSaveSuccess(true);

      setTimeout(() => setShowSaveSuccess(false), 2000);
    }, 300);
  }, [state.currentBudgetName, isSaving, hasCurrentBudget, saveCurrentBudget]);

  const handleLoadBudget = useCallback((budget: SavedBudget) => {
    setLoadingId(budget.id);

    setTimeout(() => {
      loadSavedBudget(budget.id);
      setLoadingId(null);
    }, 300);
  }, [loadSavedBudget]);

  const handleDeleteBudget = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this saved budget?")) {
      deleteSavedBudget(id);
    }
  }, [deleteSavedBudget]);

  const handleStartRename = useCallback((budget: SavedBudget) => {
    setEditingId(budget.id);
    setEditName(budget.name);
  }, []);

  const handleSaveRename = useCallback(() => {
    if (!editingId || !editName.trim()) return;

    renameSavedBudget(editingId, editName.trim());
    setEditingId(null);
    setEditName("");
  }, [editingId, editName, renameSavedBudget]);

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
    setEditName("");
  }, []);

  const getBudgetSummary = (data: SerializedBudget) => {
    const totalIncome = data.items.income.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const totalItems =
      data.items.needs.length +
      data.items.wants.length +
      data.items.savings.length +
      data.items.income.length;
    return { totalIncome, totalItems };
  };

  if (!isHydrated) return null;

  return (
    <Card className="border border-border/80 bg-card">
      <CardHeader
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="budget-manager-content"
        className="flex flex-row items-center justify-between py-3 cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Saved Budgets
          {savedBudgets.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({savedBudgets.length})
            </span>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="gap-2"
        >
          {isOpen ? "Hide" : "Show"}
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            id="budget-manager-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-5 pt-2 pb-5">
              <div className="space-y-3 rounded-lg border border-border/60 p-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Budget
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="save-budget-name"
                    key={state.currentBudgetName || "budget-name"}
                    ref={saveNameInputRef}
                    placeholder={generateBudgetName()}
                    defaultValue={state.currentBudgetName || ""}
                    className="flex-1"
                    disabled={isSaving || !hasCurrentBudget}
                  />
                  <Button
                    onClick={handleSaveBudget}
                    disabled={isSaving || !hasCurrentBudget}
                    className="gap-2 shrink-0"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : showSaveSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Budget
                      </>
                    )}
                  </Button>
                </div>
                {!hasCurrentBudget && (
                  <p className="text-xs text-muted-foreground">
                    Add some budget items first before saving.
                  </p>
                )}
                {hasCurrentBudget && (
                  <p className="text-xs text-muted-foreground">
                    Update the name if needed, then click save.
                  </p>
                )}
              </div>

              {savedBudgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No saved budgets yet</p>
                  <p className="text-xs mt-1">
                    Save your current budget to access it later
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedBudgets.map((budget, index) => {
                    const { totalIncome, totalItems } = getBudgetSummary(budget.data);
                    const isEditing = editingId === budget.id;
                    const isLoading = loadingId === budget.id;

                    return (
                      <motion.div
                        key={budget.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.03 }}
                        className="rounded-lg border border-border/60 p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-8 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveRename();
                                    if (e.key === "Escape") handleCancelRename();
                                  }}
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0"
                                  onClick={handleSaveRename}
                                  aria-label="Save rename"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 shrink-0"
                                  onClick={handleCancelRename}
                                  aria-label="Cancel rename"
                                >
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <h4 className="font-medium text-sm truncate">{budget.name}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatBudgetDate(budget.lastModifiedAt)} • {totalItems} items • {" "}
                                  {formatCurrency(totalIncome)} income
                                </p>
                              </>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLoadBudget(budget)}
                                disabled={isLoading}
                                className="gap-1.5"
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FolderOpen className="h-3.5 w-3.5" />
                                )}
                                Load
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleStartRename(budget)}
                                aria-label={`Rename ${budget.name}`}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteBudget(budget.id)}
                                aria-label={`Delete ${budget.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
