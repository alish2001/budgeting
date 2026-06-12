"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Moon,
  Sun,
  Search,
  Wallet,
  X,
  Share2,
  Download,
  FolderOpen,
  Save,
  Edit2,
  Sparkles,
  Check,
  CornerDownRight,
  Tag,
  ArrowLeft,
  ArrowRightLeft,
  Target,
  Inbox,
} from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import {
  getCategoriesInTreeOrder,
  getCategoryPathLabel,
  getDescendantCategoryIds,
  getSortedIncomeItems,
  getItemsForCategory,
  getCategoryById,
  getEffectiveTarget,
  wouldCreateCycle,
} from "@/lib/budget-plan";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useDesignLanguage } from "@/lib/design-language-context";
import { getIncomeColor, resolveCategoryColor } from "@/lib/design-language";

import type { PaletteMode } from "./types";

import { KeyboardShortcut } from "./components/keyboard-shortcut";
import { AddItemForm } from "./components/add-item-form";
import { EditItemForm } from "./components/edit-item-form";
import { CategoryNameForm } from "./components/category-name-form";
import { SetTargetForm } from "./components/set-target-form";
import { ClearConfirmation } from "./components/clear-confirmation";
import { ShareBudgetView } from "./components/share-budget-view";
import { ImportBudgetView } from "./components/import-budget-view";
import { SwitchBudgetView } from "./components/switch-budget-view";
import { RenameBudgetView } from "./components/rename-budget-view";
import { SaveBudgetView } from "./components/save-budget-view";
import { RenameSavedBudgetView } from "./components/rename-saved-budget-view";
import { DeleteSavedBudgetView } from "./components/delete-saved-budget-view";

const itemClass =
  "flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground";
const groupClass = "px-2 py-1.5 text-xs font-medium text-muted-foreground";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mode, setMode] = useState<PaletteMode>({ type: "default" });
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { designLanguage, setDesignLanguage } = useDesignLanguage();
  const router = useRouter();
  const {
    state,
    savedBudgets,
    removeIncomeItem,
    removeBudgetItem,
    moveBudgetItem,
    addCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    updateCategoryTarget,
    clearAllData,
    isHydrated,
  } = useBudget();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const closePalette = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      setMode({ type: "default" });
      setSearch("");
    }, 150);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.isContentEditable);
      const hasTextValue =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
          ? target.value.length > 0
          : Boolean(target?.textContent);

      if (e.key === "Escape" || (e.key === "Backspace" && !search && !hasTextValue)) {
        if (e.key === "Backspace" && isTextInput) return;
        e.preventDefault();
        if (mode.type !== "default") {
          setMode({ type: "default" });
          setSearch("");
        } else {
          closePalette();
        }
      }
    },
    [mode.type, search, closePalette],
  );

  // Tree-ordered rows with "Needs › Housing" path labels; the labels feed the
  // cmdk `value` strings too, so searches match on any ancestor name.
  const categoryRows = getCategoriesInTreeOrder(state).map(({ category, depth }) => ({
    category,
    depth,
    pathLabel: getCategoryPathLabel(state, category.id),
  }));
  const categories = categoryRows.map((row) => row.category);
  const incomeItems = getSortedIncomeItems(state);
  const unassignedItems = getItemsForCategory(state, null);
  const incomeColor = getIncomeColor(designLanguage);

  const totalItems = incomeItems.length + state.budgetItems.length;
  const hasItems = totalItems > 0;
  const hasBudgetItems = state.budgetItems.length > 0;
  const hasCategories = categories.length > 0;
  const hasSavedBudgets = savedBudgets.length > 0;

  const handleSelect = useCallback(
    (action: string) => {
      switch (action) {
        case "add-income":
          setMode({ type: "add", target: { type: "income" } });
          setSearch("");
          break;
        case "add-to-category":
          setMode({ type: "add-pick-category" });
          setSearch("");
          break;
        case "add-category":
          setMode({ type: "add-category" });
          setSearch("");
          break;
        case "add-subcategory":
          setMode({ type: "add-subcategory-pick" });
          setSearch("");
          break;
        case "move-category":
          setMode({ type: "move-category-pick" });
          setSearch("");
          break;
        case "rename-category":
          setMode({ type: "rename-category-pick" });
          setSearch("");
          break;
        case "delete-category":
          setMode({ type: "delete-category-pick" });
          setSearch("");
          break;
        case "set-target":
          setMode({ type: "set-target-pick" });
          setSearch("");
          break;
        case "move-item":
          setMode({ type: "move-item-search" });
          setSearch("");
          break;
        case "edit":
          setMode({ type: "edit-search" });
          setSearch("");
          break;
        case "remove":
          setMode({ type: "remove-search" });
          setSearch("");
          break;
        case "clear":
          setMode({ type: "confirm-clear" });
          break;
        case "share":
          setMode({ type: "share" });
          setSearch("");
          break;
        case "import":
          setMode({ type: "import" });
          setSearch("");
          break;
        case "switch-budget":
          setMode({ type: "switch-budget" });
          setSearch("");
          break;
        case "save-budget":
          setMode({ type: "save-budget" });
          setSearch("");
          break;
        case "rename-budget":
          setMode({ type: "rename-budget" });
          setSearch("");
          break;
        case "rename-saved-budget":
          setMode({ type: "rename-saved-budget" });
          setSearch("");
          break;
        case "delete-saved-budget":
          setMode({ type: "delete-saved-budget" });
          setSearch("");
          break;
        case "onboarding":
          closePalette();
          setTimeout(() => router.push("/onboarding"), 170);
          break;
        case "toggle-theme":
          setTheme(theme === "dark" ? "light" : "dark");
          closePalette();
          break;
        case "design-cyberpunk":
          setDesignLanguage("cyberpunk");
          closePalette();
          break;
        case "design-delight":
          setDesignLanguage("delight");
          closePalette();
          break;
        default:
          break;
      }
    },
    [theme, setTheme, closePalette, router, setDesignLanguage],
  );

  const handleClearConfirm = useCallback(() => {
    clearAllData();
    closePalette();
  }, [clearAllData, closePalette]);

  if (!isHydrated) return null;

  // --- Search list helpers (edit / remove) ---
  const renderItemSearch = (action: "edit" | "remove") => {
    const onSelectIncome = (item: { id: string; label: string; amount: number }) => {
      if (action === "remove") {
        removeIncomeItem(item.id);
        if (totalItems - 1 === 0) setMode({ type: "default" });
      } else {
        setMode({ type: "edit-form", itemKind: "income", item });
        setSearch("");
      }
    };
    const onSelectBudget = (item: { id: string; label: string; amount: number }) => {
      if (action === "remove") {
        removeBudgetItem(item.id);
        if (totalItems - 1 === 0) setMode({ type: "default" });
      } else {
        setMode({ type: "edit-form", itemKind: "budget", item });
        setSearch("");
      }
    };

    return (
      <>
        {incomeItems.length > 0 && (
          <Command.Group heading="Income" className={groupClass}>
            {incomeItems.map((item) => (
              <Command.Item
                key={item.id}
                value={`${item.label} income`}
                onSelect={() => onSelectIncome(item)}
                className={
                  action === "remove"
                    ? "flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive"
                    : itemClass
                }
              >
                <Wallet className="size-4" style={{ color: incomeColor }} />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="text-sm text-muted-foreground font-mono">{formatCurrency(item.amount)}</span>
                {action === "remove" && <Trash2 className="size-4 opacity-50" />}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {categoryRows.map(({ category, pathLabel }) => {
          const items = getItemsForCategory(state, category.id);
          if (items.length === 0) return null;
          const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
          return (
            <Command.Group key={category.id} heading={pathLabel} className={groupClass}>
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${pathLabel}`}
                  onSelect={() => onSelectBudget(item)}
                  className={
                    action === "remove"
                      ? "flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive"
                      : itemClass
                  }
                >
                  <Tag className="size-4" style={{ color }} />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-sm text-muted-foreground font-mono">{formatCurrency(item.amount)}</span>
                  {action === "remove" && <Trash2 className="size-4 opacity-50" />}
                </Command.Item>
              ))}
            </Command.Group>
          );
        })}

        {unassignedItems.length > 0 && (
          <Command.Group heading="Unassigned" className={groupClass}>
            {unassignedItems.map((item) => (
              <Command.Item
                key={item.id}
                value={`${item.label} unassigned`}
                onSelect={() => onSelectBudget(item)}
                className={
                  action === "remove"
                    ? "flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive"
                    : itemClass
                }
              >
                <Inbox className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate">{item.label}</span>
                <span className="text-sm text-muted-foreground font-mono">{formatCurrency(item.amount)}</span>
                {action === "remove" && <Trash2 className="size-4 opacity-50" />}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </>
    );
  };

  const searchShell = (placeholder: string, children: React.ReactNode) => (
    <>
      <div className="flex items-center border-b border-border px-3">
        <button
          onClick={() => setMode({ type: "default" })}
          className="p-1 hover:bg-muted rounded-md transition-colors mr-2"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Search className="size-4 text-muted-foreground shrink-0" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder={placeholder}
          className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          autoFocus
        />
        <KeyboardShortcut shortcut="ESC" />
      </div>
      <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
          No results found.
        </Command.Empty>
        {children}
      </Command.List>
    </>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={isClosing ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closePalette}
          />
        </DialogPrimitive.Overlay>

        <DialogPrimitive.Content asChild onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={closePalette}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={isClosing ? { opacity: 0, scale: 0.95, y: -20 } : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "fixed left-1/2 top-[20%] -translate-x-1/2 z-50",
              "w-full max-w-[calc(100vw-2rem)] sm:max-w-lg",
              "bg-popover border border-border rounded-xl shadow-2xl overflow-hidden",
              "max-h-[min(500px,80vh)]",
            )}
          >
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Command Menu</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <DialogPrimitive.Description className="sr-only">
              Quick actions and commands for managing your budget
            </DialogPrimitive.Description>

            <Command onKeyDown={handleKeyDown} label="Command Menu">
              <AnimatePresence mode="wait">
                {mode.type === "default" && (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    onAnimationComplete={() => inputRef.current?.focus()}
                  >
                    <div className="flex items-center border-b border-border px-3">
                      <Search className="size-4 text-muted-foreground shrink-0" />
                      <Command.Input
                        ref={inputRef}
                        value={search}
                        onValueChange={setSearch}
                        placeholder="Type a command or search…"
                        className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                      />
                      <KeyboardShortcut shortcut="⌘K" />
                    </div>

                    <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
                      <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                        No commands found.
                      </Command.Empty>

                      <Command.Group heading="Add" className={groupClass}>
                        <Command.Item value="Add Income" onSelect={() => handleSelect("add-income")} className={itemClass}>
                          <Wallet className="size-4" style={{ color: incomeColor }} />
                          <span className="flex-1">Add Income</span>
                        </Command.Item>
                        {hasCategories && (
                          <Command.Item value="Add budget to category" onSelect={() => handleSelect("add-to-category")} className={itemClass}>
                            <Plus className="size-4" />
                            <span className="flex-1">Add budget to category…</span>
                          </Command.Item>
                        )}
                      </Command.Group>

                      <Command.Group heading="Categories" className={groupClass}>
                        <Command.Item value="Add Category" onSelect={() => handleSelect("add-category")} className={itemClass}>
                          <Tag className="size-4" />
                          <span className="flex-1">Add category…</span>
                        </Command.Item>
                        {hasCategories && (
                          <>
                            <Command.Item value="Add Subcategory" onSelect={() => handleSelect("add-subcategory")} className={itemClass}>
                              <CornerDownRight className="size-4" />
                              <span className="flex-1">Add subcategory…</span>
                            </Command.Item>
                            <Command.Item value="Move Category" onSelect={() => handleSelect("move-category")} className={itemClass}>
                              <ArrowRightLeft className="size-4" />
                              <span className="flex-1">Move category…</span>
                            </Command.Item>
                            <Command.Item value="Rename Category" onSelect={() => handleSelect("rename-category")} className={itemClass}>
                              <Pencil className="size-4" />
                              <span className="flex-1">Rename category…</span>
                            </Command.Item>
                            <Command.Item value="Set Category Target" onSelect={() => handleSelect("set-target")} className={itemClass}>
                              <Target className="size-4" />
                              <span className="flex-1">Set category target…</span>
                            </Command.Item>
                            <Command.Item value="Delete Category" onSelect={() => handleSelect("delete-category")} className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive">
                              <Trash2 className="size-4" />
                              <span className="flex-1">Delete category…</span>
                            </Command.Item>
                          </>
                        )}
                      </Command.Group>

                      {hasItems && (
                        <Command.Group heading="Items" className={groupClass}>
                          <Command.Item value="Edit Item" onSelect={() => handleSelect("edit")} className={itemClass}>
                            <Pencil className="size-4" />
                            <span className="flex-1">Edit item…</span>
                          </Command.Item>
                          {hasBudgetItems && (
                            <Command.Item value="Move Budget" onSelect={() => handleSelect("move-item")} className={itemClass}>
                              <ArrowRightLeft className="size-4" />
                              <span className="flex-1">Move budget to category…</span>
                            </Command.Item>
                          )}
                          <Command.Item value="Remove Item" onSelect={() => handleSelect("remove")} className={itemClass}>
                            <Trash2 className="size-4" />
                            <span className="flex-1">Remove item…</span>
                          </Command.Item>
                        </Command.Group>
                      )}

                      <Command.Group heading="Budget" className={groupClass}>
                        {hasItems && (
                          <>
                            <Command.Item value="Save Budget" onSelect={() => handleSelect("save-budget")} className={itemClass}>
                              <Save className="size-4" />
                              <span className="flex-1">Save Budget…</span>
                            </Command.Item>
                            <Command.Item value="Rename Budget" onSelect={() => handleSelect("rename-budget")} className={itemClass}>
                              <Edit2 className="size-4" />
                              <span className="flex-1">Rename Current Budget</span>
                            </Command.Item>
                            <Command.Item value="Share Budget" onSelect={() => handleSelect("share")} className={itemClass}>
                              <Share2 className="size-4" />
                              <span className="flex-1">Share Budget</span>
                            </Command.Item>
                          </>
                        )}
                        <Command.Item value="Import Budget" onSelect={() => handleSelect("import")} className={itemClass}>
                          <Download className="size-4" />
                          <span className="flex-1">Import Budget</span>
                        </Command.Item>
                        <Command.Item value="Switch Budget" onSelect={() => handleSelect("switch-budget")} className={itemClass}>
                          <FolderOpen className="size-4" />
                          <span className="flex-1">Switch Budget</span>
                        </Command.Item>
                        {hasSavedBudgets && (
                          <>
                            <Command.Item value="Rename Saved Budget" onSelect={() => handleSelect("rename-saved-budget")} className={itemClass}>
                              <Edit2 className="size-4" />
                              <span className="flex-1">Rename Saved Budget…</span>
                            </Command.Item>
                            <Command.Item value="Delete Saved Budget" onSelect={() => handleSelect("delete-saved-budget")} className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive">
                              <Trash2 className="size-4" />
                              <span className="flex-1">Delete Saved Budget…</span>
                            </Command.Item>
                          </>
                        )}
                      </Command.Group>

                      <Command.Group heading="Navigate" className={groupClass}>
                        <Command.Item value="Start Onboarding" onSelect={() => handleSelect("onboarding")} className={itemClass}>
                          <Sparkles className="size-4" />
                          <span className="flex-1">Start Onboarding…</span>
                        </Command.Item>
                      </Command.Group>

                      <Command.Group heading="Actions" className={groupClass}>
                        <Command.Item value="Use Cyberpunk Design" onSelect={() => handleSelect("design-cyberpunk")} className={itemClass}>
                          <Sparkles className="size-4" />
                          <span className="flex-1">Use Cyberpunk Design</span>
                          {designLanguage === "cyberpunk" && <Check className="size-4 text-muted-foreground" />}
                        </Command.Item>
                        <Command.Item value="Use Delight Design" onSelect={() => handleSelect("design-delight")} className={itemClass}>
                          <Sparkles className="size-4" />
                          <span className="flex-1">Use Delight Design</span>
                          {designLanguage === "delight" && <Check className="size-4 text-muted-foreground" />}
                        </Command.Item>
                        <Command.Item value="Toggle Theme" onSelect={() => handleSelect("toggle-theme")} className={itemClass}>
                          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                          <span className="flex-1">{theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
                        </Command.Item>
                        {hasItems && (
                          <Command.Item value="Clear All Data" onSelect={() => handleSelect("clear")} className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-destructive">
                            <X className="size-4" />
                            <span className="flex-1">Clear All Data</span>
                          </Command.Item>
                        )}
                      </Command.Group>
                    </Command.List>

                    <div className="border-t border-border px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>navigate</span>
                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>select</span>
                        <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">esc</kbd>close</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Pick a category to add a budget to */}
                {mode.type === "add-pick-category" && (
                  <motion.div key="add-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Choose a category…", (
                      <>
                        {categoryRows.map(({ category, pathLabel }) => {
                          const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
                          return (
                            <Command.Item
                              key={category.id}
                              value={pathLabel}
                              onSelect={() => setMode({ type: "add", target: { type: "category", categoryId: category.id } })}
                              className={itemClass}
                            >
                              <Tag className="size-4" style={{ color }} />
                              <span className="flex-1 truncate">{pathLabel}</span>
                            </Command.Item>
                          );
                        })}
                      </>
                    ))}
                  </motion.div>
                )}

                {mode.type === "add" && (
                  <AddItemForm
                    key="add-form"
                    target={mode.target}
                    onSuccess={() => { setMode({ type: "default" }); closePalette(); }}
                    onCancel={() => setMode({ type: "default" })}
                  />
                )}

                {mode.type === "edit-search" && (
                  <motion.div key="edit-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Search items to edit…", renderItemSearch("edit"))}
                  </motion.div>
                )}

                {mode.type === "edit-form" && (
                  <EditItemForm
                    key={`edit-${mode.item.id}`}
                    itemKind={mode.itemKind}
                    item={mode.item}
                    onSuccess={() => { setMode({ type: "default" }); closePalette(); }}
                    onCancel={() => setMode({ type: "edit-search" })}
                  />
                )}

                {mode.type === "remove-search" && (
                  <motion.div key="remove-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Search items to remove…", renderItemSearch("remove"))}
                  </motion.div>
                )}

                {/* Move budget item: pick item */}
                {mode.type === "move-item-search" && (
                  <motion.div key="move-search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Search a budget to move…", (
                      <>
                      {categoryRows.map(({ category, pathLabel }) => {
                        const items = getItemsForCategory(state, category.id);
                        if (items.length === 0) return null;
                        return (
                          <Command.Group key={category.id} heading={pathLabel} className={groupClass}>
                            {items.map((item) => (
                              <Command.Item
                                key={item.id}
                                value={`${item.label} ${pathLabel}`}
                                onSelect={() => setMode({ type: "move-item-target", itemId: item.id, itemLabel: item.label })}
                                className={itemClass}
                              >
                                <ArrowRightLeft className="size-4" />
                                <span className="flex-1 truncate">{item.label}</span>
                                <span className="text-sm text-muted-foreground font-mono">{formatCurrency(item.amount)}</span>
                              </Command.Item>
                            ))}
                          </Command.Group>
                        );
                      })}
                      {unassignedItems.length > 0 && (
                        <Command.Group heading="Unassigned" className={groupClass}>
                          {unassignedItems.map((item) => (
                            <Command.Item
                              key={item.id}
                              value={`${item.label} unassigned`}
                              onSelect={() => setMode({ type: "move-item-target", itemId: item.id, itemLabel: item.label })}
                              className={itemClass}
                            >
                              <ArrowRightLeft className="size-4" />
                              <span className="flex-1 truncate">{item.label}</span>
                              <span className="text-sm text-muted-foreground font-mono">{formatCurrency(item.amount)}</span>
                            </Command.Item>
                          ))}
                        </Command.Group>
                      )}
                      </>
                    ))}
                  </motion.div>
                )}

                {/* Move budget item: pick destination */}
                {mode.type === "move-item-target" && (
                  <motion.div key="move-target" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    <div className="flex items-center border-b border-border px-3">
                      <button onClick={() => setMode({ type: "move-item-search" })} className="p-1 hover:bg-muted rounded-md transition-colors mr-2" aria-label="Go back">
                        <ArrowLeft className="size-4" />
                      </button>
                      <Search className="size-4 text-muted-foreground shrink-0" />
                      <Command.Input value={search} onValueChange={setSearch} placeholder={`Move “${mode.itemLabel}” to…`} className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground" autoFocus />
                      <KeyboardShortcut shortcut="ESC" />
                    </div>
                    <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
                      <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No categories found.</Command.Empty>
                      {categoryRows.map(({ category, pathLabel }) => {
                        const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
                        return (
                          <Command.Item
                            key={category.id}
                            value={pathLabel}
                            onSelect={() => { moveBudgetItem(mode.itemId, category.id); setMode({ type: "default" }); closePalette(); }}
                            className={itemClass}
                          >
                            <Tag className="size-4" style={{ color }} />
                            <span className="flex-1 truncate">{pathLabel}</span>
                          </Command.Item>
                        );
                      })}
                      <Command.Item
                        value="Unassigned"
                        onSelect={() => { moveBudgetItem(mode.itemId, null); setMode({ type: "default" }); closePalette(); }}
                        className={itemClass}
                      >
                        <Inbox className="size-4 text-muted-foreground" />
                        <span className="flex-1">Unassigned</span>
                      </Command.Item>
                    </Command.List>
                  </motion.div>
                )}

                {mode.type === "add-category" && (
                  <CategoryNameForm
                    key="add-category"
                    mode="add"
                    onSubmit={(name) => { addCategory(name); setMode({ type: "default" }); closePalette(); }}
                    onCancel={() => setMode({ type: "default" })}
                  />
                )}

                {/* Add subcategory: pick the parent */}
                {mode.type === "add-subcategory-pick" && (
                  <motion.div key="add-sub-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Choose a parent category…", (
                      <>
                        {categoryRows.map(({ category, pathLabel }) => {
                          const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
                          return (
                            <Command.Item
                              key={category.id}
                              value={pathLabel}
                              onSelect={() => { setMode({ type: "add-subcategory", parentId: category.id, parentLabel: pathLabel }); setSearch(""); }}
                              className={itemClass}
                            >
                              <Tag className="size-4" style={{ color }} />
                              <span className="flex-1 truncate">{pathLabel}</span>
                            </Command.Item>
                          );
                        })}
                      </>
                    ))}
                  </motion.div>
                )}

                {mode.type === "add-subcategory" && (
                  <CategoryNameForm
                    key={`add-subcategory-${mode.parentId}`}
                    mode="add"
                    title={`Add Subcategory to ${mode.parentLabel}`}
                    onSubmit={(name) => {
                      addCategory(name, { parentCategoryId: mode.parentId });
                      setMode({ type: "default" });
                      closePalette();
                    }}
                    onCancel={() => setMode({ type: "add-subcategory-pick" })}
                  />
                )}

                {/* Move category: pick the category to move */}
                {mode.type === "move-category-pick" && (
                  <motion.div key="move-cat-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Choose a category to move…", (
                      <>
                        {categoryRows.map(({ category, pathLabel }) => {
                          const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
                          return (
                            <Command.Item
                              key={category.id}
                              value={pathLabel}
                              onSelect={() => { setMode({ type: "move-category-target", categoryId: category.id, categoryLabel: pathLabel }); setSearch(""); }}
                              className={itemClass}
                            >
                              <Tag className="size-4" style={{ color }} />
                              <span className="flex-1 truncate">{pathLabel}</span>
                            </Command.Item>
                          );
                        })}
                      </>
                    ))}
                  </motion.div>
                )}

                {/* Move category: pick the destination (cycle-safe) */}
                {mode.type === "move-category-target" && (() => {
                  const moving = getCategoryById(state, mode.categoryId);
                  const currentParent = moving?.parentCategoryId ?? null;
                  const destinations = categoryRows.filter(
                    ({ category }) =>
                      category.id !== mode.categoryId &&
                      category.id !== currentParent &&
                      !wouldCreateCycle(state.categories, mode.categoryId, category.id),
                  );
                  return (
                    <motion.div key="move-cat-target" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                      <div className="flex items-center border-b border-border px-3">
                        <button onClick={() => setMode({ type: "move-category-pick" })} className="p-1 hover:bg-muted rounded-md transition-colors mr-2" aria-label="Go back">
                          <ArrowLeft className="size-4" />
                        </button>
                        <Search className="size-4 text-muted-foreground shrink-0" />
                        <Command.Input value={search} onValueChange={setSearch} placeholder={`Move “${mode.categoryLabel}” under…`} className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground" autoFocus />
                        <KeyboardShortcut shortcut="ESC" />
                      </div>
                      <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
                        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No destinations found.</Command.Empty>
                        {currentParent !== null && (
                          <Command.Item
                            value="Top level"
                            onSelect={() => { moveCategory(mode.categoryId, null); setMode({ type: "default" }); closePalette(); }}
                            className={itemClass}
                          >
                            <Inbox className="size-4 text-muted-foreground" />
                            <span className="flex-1">Top level</span>
                          </Command.Item>
                        )}
                        {destinations.map(({ category, pathLabel }) => {
                          const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
                          return (
                            <Command.Item
                              key={category.id}
                              value={pathLabel}
                              onSelect={() => { moveCategory(mode.categoryId, category.id); setMode({ type: "default" }); closePalette(); }}
                              className={itemClass}
                            >
                              <Tag className="size-4" style={{ color }} />
                              <span className="flex-1 truncate">{pathLabel}</span>
                            </Command.Item>
                          );
                        })}
                      </Command.List>
                    </motion.div>
                  );
                })()}

                {mode.type === "rename-category-pick" && (
                  <motion.div key="rename-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Choose a category to rename…", (
                      <>
                        {categoryRows.map(({ category, pathLabel }) => (
                          <Command.Item key={category.id} value={pathLabel} onSelect={() => setMode({ type: "rename-category", categoryId: category.id })} className={itemClass}>
                            <Pencil className="size-4" />
                            <span className="flex-1 truncate">{pathLabel}</span>
                          </Command.Item>
                        ))}
                      </>
                    ))}
                  </motion.div>
                )}

                {mode.type === "rename-category" && (
                  <CategoryNameForm
                    key={`rename-${mode.categoryId}`}
                    mode="rename"
                    initialName={getCategoryById(state, mode.categoryId)?.name ?? ""}
                    onSubmit={(name) => { renameCategory(mode.categoryId, name); setMode({ type: "default" }); closePalette(); }}
                    onCancel={() => setMode({ type: "rename-category-pick" })}
                  />
                )}

                {mode.type === "set-target-pick" && (
                  <motion.div key="target-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Choose a category…", (
                      <>
                        {categoryRows.map(({ category, pathLabel }) => {
                          const effective = getEffectiveTarget(state, category.id);
                          return (
                            <Command.Item key={category.id} value={pathLabel} onSelect={() => setMode({ type: "set-target", categoryId: category.id })} className={itemClass}>
                              <Target className="size-4" />
                              <span className="flex-1 truncate">{pathLabel}</span>
                              <span className="text-sm text-muted-foreground font-mono">
                                {category.targetPercentage}%
                                {effective !== category.targetPercentage ? ` (${effective}%)` : ""}
                              </span>
                            </Command.Item>
                          );
                        })}
                      </>
                    ))}
                  </motion.div>
                )}

                {mode.type === "set-target" && (
                  <SetTargetForm
                    key={`target-${mode.categoryId}`}
                    categoryName={getCategoryById(state, mode.categoryId)?.name ?? ""}
                    initialValue={getCategoryById(state, mode.categoryId)?.targetPercentage ?? 0}
                    onSubmit={(value) => { updateCategoryTarget(mode.categoryId, value); setMode({ type: "default" }); closePalette(); }}
                    onCancel={() => setMode({ type: "set-target-pick" })}
                  />
                )}

                {mode.type === "delete-category-pick" && (
                  <motion.div key="delete-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                    {searchShell("Choose a category to delete…", (
                      <>
                        {categoryRows.map(({ category, pathLabel }) => {
                          const count = getItemsForCategory(state, category.id).length;
                          const descendantCount = getDescendantCategoryIds(state.categories, category.id).length;
                          const infoParts = [
                            descendantCount > 0
                              ? `${descendantCount} subcategor${descendantCount === 1 ? "y" : "ies"}`
                              : null,
                            count > 0 ? `${count} item${count === 1 ? "" : "s"} → Unassigned` : null,
                          ].filter(Boolean);
                          return (
                            <Command.Item
                              key={category.id}
                              value={pathLabel}
                              onSelect={() => {
                                // Leaf categories delete immediately (items kept
                                // as Unassigned); parents need a child choice.
                                if (descendantCount > 0) {
                                  setMode({ type: "delete-category-confirm", categoryId: category.id });
                                  setSearch("");
                                  return;
                                }
                                deleteCategory(category.id, "keep");
                                if (categories.length === 1) setMode({ type: "default" });
                              }}
                              className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive"
                            >
                              <Trash2 className="size-4" />
                              <span className="flex-1 truncate">{pathLabel}</span>
                              <span className="text-xs text-muted-foreground">
                                {infoParts.length > 0 ? infoParts.join(" · ") : "empty"}
                              </span>
                            </Command.Item>
                          );
                        })}
                      </>
                    ))}
                  </motion.div>
                )}

                {/* Delete a category that has subcategories: choose what happens to them */}
                {mode.type === "delete-category-confirm" && (() => {
                  const target = getCategoryById(state, mode.categoryId);
                  if (!target) return null;
                  const descendantCount = getDescendantCategoryIds(state.categories, mode.categoryId).length;
                  return (
                    <motion.div key="delete-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                      <div className="flex items-center border-b border-border px-3 h-12">
                        <button onClick={() => setMode({ type: "delete-category-pick" })} className="p-1 hover:bg-muted rounded-md transition-colors mr-2" aria-label="Go back">
                          <ArrowLeft className="size-4" />
                        </button>
                        <span className="text-sm font-medium truncate">
                          Delete “{getCategoryPathLabel(state, mode.categoryId)}” — {descendantCount} subcategor{descendantCount === 1 ? "y" : "ies"}
                        </span>
                      </div>
                      <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
                        <Command.Item
                          value="Promote subcategories up a level"
                          onSelect={() => { deleteCategory(mode.categoryId, "keep", "promote"); setMode({ type: "default" }); closePalette(); }}
                          className={itemClass}
                        >
                          <CornerDownRight className="size-4" />
                          <div className="flex-1 min-w-0">
                            <span className="block">Promote subcategories up a level</span>
                            <span className="block text-xs text-muted-foreground">Its own items move to Unassigned</span>
                          </div>
                        </Command.Item>
                        <Command.Item
                          value="Delete whole subtree"
                          onSelect={() => { deleteCategory(mode.categoryId, "keep", "delete-subtree"); setMode({ type: "default" }); closePalette(); }}
                          className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          <div className="flex-1 min-w-0">
                            <span className="block">Delete the whole subtree</span>
                            <span className="block text-xs text-muted-foreground">All subtree items move to Unassigned</span>
                          </div>
                        </Command.Item>
                      </Command.List>
                    </motion.div>
                  );
                })()}

                {mode.type === "confirm-clear" && (
                  <ClearConfirmation key="confirm-clear" onConfirm={handleClearConfirm} onCancel={() => setMode({ type: "default" })} />
                )}
                {mode.type === "share" && <ShareBudgetView key="share" onCancel={() => setMode({ type: "default" })} />}
                {mode.type === "import" && (
                  <ImportBudgetView key="import" onCancel={() => setMode({ type: "default" })} onSuccess={() => { setMode({ type: "default" }); closePalette(); }} />
                )}
                {mode.type === "switch-budget" && (
                  <SwitchBudgetView key="switch-budget" onCancel={() => setMode({ type: "default" })} onSuccess={() => { setMode({ type: "default" }); closePalette(); }} />
                )}
                {mode.type === "rename-budget" && (
                  <RenameBudgetView key="rename-budget" onCancel={() => setMode({ type: "default" })} onSuccess={() => { setMode({ type: "default" }); closePalette(); }} />
                )}
                {mode.type === "save-budget" && (
                  <SaveBudgetView key="save-budget" onCancel={() => setMode({ type: "default" })} onSuccess={() => { setMode({ type: "default" }); closePalette(); }} />
                )}
                {mode.type === "rename-saved-budget" && (
                  <RenameSavedBudgetView key="rename-saved-budget" onCancel={() => setMode({ type: "default" })} onSuccess={() => { setMode({ type: "default" }); closePalette(); }} />
                )}
                {mode.type === "delete-saved-budget" && (
                  <DeleteSavedBudgetView key="delete-saved-budget" onCancel={() => setMode({ type: "default" })} onSuccess={() => { setMode({ type: "default" }); closePalette(); }} />
                )}
              </AnimatePresence>
            </Command>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
