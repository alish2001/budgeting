"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudget } from "@/lib/budget-context";
import {
  getSavedBudgets,
  saveBudgetToStorage,
  deleteSavedBudget,
  renameSavedBudget,
  formatBudgetDate,
  generateBudgetName,
} from "@/lib/budget-storage";
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
  Plus,
  Loader2,
} from "lucide-react";

// Cache for useSyncExternalStore - must return same reference if data unchanged
let cachedBudgets: SavedBudget[] = [];
let cachedVersion = -1;
const budgetStorageListeners = new Set<() => void>();

function notifyBudgetStorageChange() {
  // Invalidate cache and notify listeners
  cachedVersion = -1;
  budgetStorageListeners.forEach((listener) => listener());
}

function subscribeToBudgetStorage(callback: () => void) {
  budgetStorageListeners.add(callback);
  return () => budgetStorageListeners.delete(callback);
}

function getBudgetStorageSnapshot(): SavedBudget[] {
  // Only fetch from localStorage if cache is invalidated
  if (cachedVersion === -1) {
    cachedBudgets = getSavedBudgets();
    cachedVersion = 0;
  }
  return cachedBudgets;
}

// Cache the server snapshot to avoid infinite loop
// (React requires getServerSnapshot to return the same reference)
const EMPTY_SAVED_BUDGETS: SavedBudget[] = [];

function getServerSnapshot(): SavedBudget[] {
  return EMPTY_SAVED_BUDGETS;
}

export function BudgetManager() {
  const { state, importBudget, isHydrated, getTotalIncome, setCurrentBudgetName } = useBudget();
  const [isOpen, setIsOpen] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingCurrentName, setEditingCurrentName] = useState(false);
  const [currentNameInput, setCurrentNameInput] = useState("");

  // Use useSyncExternalStore to read saved budgets from localStorage
  const savedBudgets = useSyncExternalStore(
    subscribeToBudgetStorage,
    getBudgetStorageSnapshot,
    getServerSnapshot
  );

  const handleSaveBudget = useCallback(() => {
    if (isSaving) return;

    setIsSaving(true);

    setTimeout(() => {
      // Use current budget name if set, otherwise use input or generate
      const name = state.currentBudgetName || newBudgetName.trim() || generateBudgetName();
      saveBudgetToStorage(state, name);
      notifyBudgetStorageChange();
      setNewBudgetName("");
      setIsSaving(false);
      setShowSaveSuccess(true);

      setTimeout(() => setShowSaveSuccess(false), 2000);
    }, 300);
  }, [state, newBudgetName, isSaving]);

  const handleLoadBudget = useCallback(
    (budget: SavedBudget) => {
      setLoadingId(budget.id);

      setTimeout(() => {
        importBudget(budget.data);
        setLoadingId(null);
      }, 300);
    },
    [importBudget]
  );

  const handleDeleteBudget = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this saved budget?")) {
      deleteSavedBudget(id);
      notifyBudgetStorageChange();
    }
  }, []);

  const handleStartRename = useCallback((budget: SavedBudget) => {
    setEditingId(budget.id);
    setEditName(budget.name);
  }, []);

  const handleSaveRename = useCallback(() => {
    if (!editingId || !editName.trim()) return;

    renameSavedBudget(editingId, editName.trim());
    notifyBudgetStorageChange();
    setEditingId(null);
    setEditName("");
  }, [editingId, editName]);

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
    setEditName("");
  }, []);

  const handleStartRenameCurrent = useCallback(() => {
    setEditingCurrentName(true);
    setCurrentNameInput(state.currentBudgetName || "");
  }, [state.currentBudgetName]);

  const handleSaveCurrentName = useCallback(() => {
    const trimmed = currentNameInput.trim();
    setCurrentBudgetName(trimmed || undefined);
    setEditingCurrentName(false);
    setCurrentNameInput("");
  }, [currentNameInput, setCurrentBudgetName]);

  const handleCancelCurrentName = useCallback(() => {
    setEditingCurrentName(false);
    setCurrentNameInput("");
  }, []);

  const getBudgetSummary = (data: SerializedBudget) => {
    const totalIncome = data.items.income.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalItems =
      data.items.needs.length +
      data.items.wants.length +
      data.items.savings.length +
      data.items.income.length;
    return { totalIncome, totalItems };
  };

  const totalIncome = getTotalIncome();
  const hasCurrentBudget =
    totalIncome > 0 ||
    state.categories.needs.items.length > 0 ||
    state.categories.wants.items.length > 0 ||
    state.categories.savings.items.length > 0;

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
              {/* Current Budget Name */}
              {hasCurrentBudget && (
                <div className="space-y-2 rounded-lg border border-border/60 p-3">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Current Budget Name
                  </Label>
                  {editingCurrentName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={currentNameInput}
                        onChange={(e) => setCurrentNameInput(e.target.value)}
                        className="h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveCurrentName();
                          if (e.key === "Escape") handleCancelCurrentName();
                        }}
                        placeholder="Enter budget name..."
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={handleSaveCurrentName}
                        aria-label="Save name"
                      >
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={handleCancelCurrentName}
                        aria-label="Cancel rename"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate flex-1">
                        {state.currentBudgetName || "Unnamed Budget"}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={handleStartRenameCurrent}
                        aria-label="Rename current budget"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    This name will be used when you save this budget.
                  </p>
                </div>
              )}

              {/* Save Current Budget */}
              <div className="space-y-3 rounded-lg border border-border/60 p-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Save Current Budget
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder={state.currentBudgetName || generateBudgetName()}
                    value={newBudgetName}
                    onChange={(e) => setNewBudgetName(e.target.value)}
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
              </div>

              {/* Saved Budgets List */}
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
                    const { totalIncome, totalItems } = getBudgetSummary(
                      budget.data
                    );
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
                                <h4 className="font-medium text-sm truncate">
                                  {budget.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatBudgetDate(budget.lastModifiedAt)} •{" "}
                                  {totalItems} items •{" "}
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
