"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Plus,
  Pencil,
  Trash2,
  Moon,
  Sun,
  Search,
  DollarSign,
  PiggyBank,
  ShoppingBag,
  Wallet,
  X,
  Share2,
  Download,
  FolderOpen,
  Edit2,
} from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import {
  CategoryName,
  BudgetItem,
  CATEGORY_CONFIG,
} from "@/types/budget";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// Types
import type { PaletteMode } from "./types";

// Constants
import { CATEGORY_ICONS } from "./constants";

// Components
import { KeyboardShortcut } from "./components/keyboard-shortcut";
import { AddItemForm } from "./components/add-item-form";
import { EditItemForm } from "./components/edit-item-form";
import { ClearConfirmation } from "./components/clear-confirmation";
import { ShareBudgetView } from "./components/share-budget-view";
import { ImportBudgetView } from "./components/import-budget-view";
import { SwitchBudgetView } from "./components/switch-budget-view";
import { RenameBudgetView } from "./components/rename-budget-view";

// Main Command Palette Component
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mode, setMode] = useState<PaletteMode>({ type: "default" });
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const {
    state,
    removeItem,
    clearAllData,
    isHydrated,
  } = useBudget();

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close the palette and reset state
  const closePalette = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
      setMode({ type: "default" });
      setSearch("");
    }, 150);
  }, []);

  // Handle keyboard navigation (idiomatic cmdk pattern for nested pages)
  // This follows the exact pattern from cmdk docs for nested pages
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape" || (e.key === "Backspace" && !search)) {
      e.preventDefault();
      if (mode.type !== "default") {
        // Not at root - navigate back to default
        setMode({ type: "default" });
        setSearch("");
      } else {
        // At root - close the palette
        closePalette();
      }
    }
  }, [mode.type, search, closePalette]);

  // Get all items for edit/remove modes
  const getAllItems = useCallback(() => {
    const items: { category: CategoryName; item: BudgetItem }[] = [];
    const categories: CategoryName[] = ["income", "needs", "wants", "savings"];

    for (const category of categories) {
      for (const item of state.categories[category].items) {
        items.push({ category, item });
      }
    }

    return items;
  }, [state.categories]);

  // Handle command selection
  const handleSelect = useCallback(
    (action: string) => {
      switch (action) {
        case "add-income":
          setMode({ type: "add", category: "income" });
          setSearch("");
          break;
        case "add-needs":
          setMode({ type: "add", category: "needs" });
          setSearch("");
          break;
        case "add-wants":
          setMode({ type: "add", category: "wants" });
          setSearch("");
          break;
        case "add-savings":
          setMode({ type: "add", category: "savings" });
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
        case "rename-budget":
          setMode({ type: "rename-budget" });
          setSearch("");
          break;
        case "toggle-theme":
          setTheme(theme === "dark" ? "light" : "dark");
          closePalette();
          break;
        default:
          break;
      }
    },
    [theme, setTheme, closePalette]
  );

  // Handle item selection for edit
  const handleEditItem = useCallback(
    (category: CategoryName, item: BudgetItem) => {
      setMode({ type: "edit-form", category, item });
      setSearch("");
    },
    []
  );

  // Handle item removal
  const handleRemoveItem = useCallback(
    (category: CategoryName, itemId: string) => {
      removeItem(category, itemId);
      // If no more items, go back to default mode
      const remainingItems = getAllItems().filter(
        (i) => !(i.category === category && i.item.id === itemId)
      );
      if (remainingItems.length === 0) {
        setMode({ type: "default" });
      }
    },
    [removeItem, getAllItems]
  );

  // Handle clear confirmation
  const handleClearConfirm = useCallback(() => {
    clearAllData();
    closePalette();
  }, [clearAllData, closePalette]);

  // Don't render until hydrated
  if (!isHydrated) return null;

  const allItems = getAllItems();
  const hasItems = allItems.length > 0;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={isClosing ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closePalette}
          />
        </DialogPrimitive.Overlay>

        {/* Dialog Content */}
        <DialogPrimitive.Content
          asChild
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={closePalette}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={isClosing 
              ? { opacity: 0, scale: 0.95, y: -20 } 
              : { opacity: 1, scale: 1, y: 0 }
            }
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "fixed left-1/2 top-[20%] -translate-x-1/2 z-50",
              "w-full max-w-[calc(100vw-2rem)] sm:max-w-lg",
              "bg-popover border border-border rounded-xl shadow-2xl overflow-hidden",
              "max-h-[min(500px,80vh)]"
            )}
          >
            {/* Visually hidden title for accessibility */}
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Command Menu</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <DialogPrimitive.Description className="sr-only">
              Quick actions and commands for managing your budget
            </DialogPrimitive.Description>

            {/* Command component with our escape handling */}
            <Command onKeyDown={handleKeyDown} label="Command Menu">
        <AnimatePresence mode="wait">
          {/* Default Mode - Command List */}
          {mode.type === "default" && (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              onAnimationComplete={() => {
                // Focus the input after enter animation completes
                inputRef.current?.focus();
              }}
            >
              {/* Search Input */}
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

              {/* Command List */}
              <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No commands found.
                </Command.Empty>

                {/* Add Commands */}
                <Command.Group heading="Add" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Command.Item
                    value="Add Income"
                    onSelect={() => handleSelect("add-income")}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Wallet className="size-4" style={{ color: CATEGORY_CONFIG.income.color }} />
                    <span className="flex-1">Add Income</span>
                  </Command.Item>
                  <Command.Item
                    value="Add Need"
                    onSelect={() => handleSelect("add-needs")}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <DollarSign className="size-4" style={{ color: CATEGORY_CONFIG.needs.color }} />
                    <span className="flex-1">Add Need</span>
                  </Command.Item>
                  <Command.Item
                    value="Add Want"
                    onSelect={() => handleSelect("add-wants")}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <ShoppingBag className="size-4" style={{ color: CATEGORY_CONFIG.wants.color }} />
                    <span className="flex-1">Add Want</span>
                  </Command.Item>
                  <Command.Item
                    value="Add Saving"
                    onSelect={() => handleSelect("add-savings")}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <PiggyBank className="size-4" style={{ color: CATEGORY_CONFIG.savings.color }} />
                    <span className="flex-1">Add Saving</span>
                  </Command.Item>
                </Command.Group>

                {/* Edit/Remove Commands - Only show if there are items */}
                {hasItems && (
                  <>
                    <Command.Group heading="Edit" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <Command.Item
                        value="Edit Item"
                        onSelect={() => handleSelect("edit")}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <Pencil className="size-4" />
                        <span className="flex-1">Edit Item…</span>
                      </Command.Item>
                    </Command.Group>

                    <Command.Group heading="Remove" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      <Command.Item
                        value="Remove Item"
                        onSelect={() => handleSelect("remove")}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <Trash2 className="size-4" />
                        <span className="flex-1">Remove Item…</span>
                      </Command.Item>
                    </Command.Group>
                  </>
                )}

                {/* Budget Management */}
                <Command.Group heading="Budget" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {hasItems && (
                    <>
                      <Command.Item
                        value="Rename Budget"
                        onSelect={() => handleSelect("rename-budget")}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <Edit2 className="size-4" />
                        <span className="flex-1">Rename Current Budget</span>
                      </Command.Item>
                      <Command.Item
                        value="Share Budget"
                        onSelect={() => handleSelect("share")}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <Share2 className="size-4" />
                        <span className="flex-1">Share Budget</span>
                      </Command.Item>
                    </>
                  )}
                  <Command.Item
                    value="Import Budget"
                    onSelect={() => handleSelect("import")}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Download className="size-4" />
                    <span className="flex-1">Import Budget</span>
                  </Command.Item>
                  <Command.Item
                    value="Switch Budget"
                    onSelect={() => handleSelect("switch-budget")}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <FolderOpen className="size-4" />
                    <span className="flex-1">Switch Budget</span>
                  </Command.Item>
                </Command.Group>

                {/* Actions */}
                <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Command.Item
                    value="Toggle Theme"
                    onSelect={() => handleSelect("toggle-theme")}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    {theme === "dark" ? (
                      <Sun className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                    <span className="flex-1">
                      {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    </span>
                  </Command.Item>
                  {hasItems && (
                    <Command.Item
                      value="Clear All Data"
                      onSelect={() => handleSelect("clear")}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground text-destructive"
                    >
                      <X className="size-4" />
                      <span className="flex-1">Clear All Data</span>
                    </Command.Item>
                  )}
                </Command.Group>
              </Command.List>

              {/* Footer hint */}
              <div className="border-t border-border px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
                    navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
                    select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">esc</kbd>
                    close
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Add Mode */}
          {mode.type === "add" && (
            <AddItemForm
              key={`add-${mode.category}`}
              category={mode.category}
              onSuccess={() => {
                setMode({ type: "default" });
                closePalette();
              }}
              onCancel={() => setMode({ type: "default" })}
            />
          )}

          {/* Edit Search Mode */}
          {mode.type === "edit-search" && (
            <motion.div
              key="edit-search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-border px-3">
                <button
                  onClick={() => setMode({ type: "default" })}
                  className="p-1 hover:bg-muted rounded-md transition-colors mr-2"
                  aria-label="Go back"
                >
                  <Plus className="size-4 rotate-45" />
                </button>
                <Search className="size-4 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search items to edit…"
                  className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <KeyboardShortcut shortcut="ESC" />
              </div>

              {/* Items List */}
              <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No items found.
                </Command.Empty>

                {(["income", "needs", "wants", "savings"] as CategoryName[]).map((category) => {
                  const items = state.categories[category].items;
                  if (items.length === 0) return null;

                  const config = CATEGORY_CONFIG[category];
                  const Icon = CATEGORY_ICONS[category];

                  return (
                    <Command.Group
                      key={category}
                      heading={config.label}
                      className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                    >
                      {items.map((item) => (
                        <Command.Item
                          key={item.id}
                          value={`${item.label} ${category}`}
                          onSelect={() => handleEditItem(category, item)}
                          className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                        >
                          <Icon className="size-4" style={{ color: config.color }} />
                          <span className="flex-1 truncate">{item.label}</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatCurrency(item.amount)}
                          </span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>
            </motion.div>
          )}

          {/* Edit Form Mode */}
          {mode.type === "edit-form" && (
            <EditItemForm
              key={`edit-${mode.item.id}`}
              category={mode.category}
              item={mode.item}
              onSuccess={() => {
                setMode({ type: "default" });
                closePalette();
              }}
              onCancel={() => setMode({ type: "edit-search" })}
            />
          )}

          {/* Remove Search Mode */}
          {mode.type === "remove-search" && (
            <motion.div
              key="remove-search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-border px-3">
                <button
                  onClick={() => setMode({ type: "default" })}
                  className="p-1 hover:bg-muted rounded-md transition-colors mr-2"
                  aria-label="Go back"
                >
                  <Plus className="size-4 rotate-45" />
                </button>
                <Search className="size-4 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search items to remove…"
                  className="flex-1 h-12 px-3 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                <KeyboardShortcut shortcut="ESC" />
              </div>

              {/* Items List */}
              <Command.List className="max-h-[calc(min(500px,80vh)-3rem)] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No items found.
                </Command.Empty>

                {(["income", "needs", "wants", "savings"] as CategoryName[]).map((category) => {
                  const items = state.categories[category].items;
                  if (items.length === 0) return null;

                  const config = CATEGORY_CONFIG[category];
                  const Icon = CATEGORY_ICONS[category];

                  return (
                    <Command.Group
                      key={category}
                      heading={config.label}
                      className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                    >
                      {items.map((item) => (
                        <Command.Item
                          key={item.id}
                          value={`${item.label} ${category}`}
                          onSelect={() => handleRemoveItem(category, item.id)}
                          className="flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer aria-selected:bg-destructive/10 aria-selected:text-destructive"
                        >
                          <Icon className="size-4" style={{ color: config.color }} />
                          <span className="flex-1 truncate">{item.label}</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatCurrency(item.amount)}
                          </span>
                          <Trash2 className="size-4 opacity-50" />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>

              {/* Footer hint */}
              <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd> to remove selected item
              </div>
            </motion.div>
          )}

          {/* Clear Confirmation Mode */}
          {mode.type === "confirm-clear" && (
            <ClearConfirmation
              key="confirm-clear"
              onConfirm={handleClearConfirm}
              onCancel={() => setMode({ type: "default" })}
            />
          )}

          {/* Share Budget Mode */}
          {mode.type === "share" && (
            <ShareBudgetView
              key="share"
              onCancel={() => setMode({ type: "default" })}
            />
          )}

          {/* Import Budget Mode */}
          {mode.type === "import" && (
            <ImportBudgetView
              key="import"
              onCancel={() => setMode({ type: "default" })}
              onSuccess={() => {
                setMode({ type: "default" });
                closePalette();
              }}
            />
          )}

          {/* Switch Budget Mode */}
          {mode.type === "switch-budget" && (
            <SwitchBudgetView
              key="switch-budget"
              onCancel={() => setMode({ type: "default" })}
              onSuccess={() => {
                setMode({ type: "default" });
                closePalette();
              }}
            />
          )}

          {/* Rename Budget Mode */}
          {mode.type === "rename-budget" && (
            <RenameBudgetView
              key="rename-budget"
              onCancel={() => setMode({ type: "default" })}
              onSuccess={() => {
                setMode({ type: "default" });
                closePalette();
              }}
            />
          )}
        </AnimatePresence>
            </Command>
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
