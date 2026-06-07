"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Plus,
  Wallet,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { BudgetCategory, BudgetLineItem, IncomeItem } from "@/types/budget";
import { useBudget } from "@/lib/budget-context";
import {
  getItemsForCategory,
  getSortedCategories,
  getSortedIncomeItems,
  getUnassignedItems,
} from "@/lib/budget-plan";
import { formatCurrency } from "@/lib/utils";
import { useDesignLanguage } from "@/lib/design-language-context";
import {
  getIncomeColor,
  getUnassignedColor,
  resolveCategoryColor,
} from "@/lib/design-language";
import { BudgetInput } from "@/components/budget-input";

// ---------------------------------------------------------------------------
// Item row (sortable / draggable)
// ---------------------------------------------------------------------------

interface ItemRowProps {
  item: { id: string; label: string; amount: number };
  color: string;
  onEdit: () => void;
  onRemove: () => void;
  draggable?: boolean;
  moveMenu?: React.ReactNode;
}

export const SortableItemRow = memo(function SortableItemRow({
  item,
  color,
  onEdit,
  onRemove,
  moveMenu,
}: ItemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { type: "item" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1 p-2 bg-muted/30 rounded-md group hover:bg-muted/50 transition-colors"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none shrink-0"
        aria-label={`Drag ${item.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 text-left flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        aria-label={`Edit ${item.label}: ${formatCurrency(item.amount)}`}
      >
        <span className="text-sm font-medium truncate" style={{ color }}>
          {item.label}
        </span>
        <span className="text-sm text-muted-foreground shrink-0">
          {formatCurrency(item.amount)}
        </span>
      </button>
      {moveMenu}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground/50 hover:text-destructive transition-colors text-lg leading-none px-1 shrink-0"
        aria-label={`Remove ${item.label}`}
      >
        ×
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Category card
// ---------------------------------------------------------------------------

interface CategoryCardProps {
  category: BudgetCategory;
  isFirst: boolean;
  isLast: boolean;
}

export const CategoryCard = memo(function CategoryCard({
  category,
  isFirst,
  isLast,
}: CategoryCardProps) {
  const {
    state,
    getTotalForCategory,
    getTotalIncome,
    removeBudgetItem,
    moveBudgetItem,
    renameCategory,
    deleteCategory,
    updateCategoryTarget,
    reorderCategories,
  } = useBudget();
  const { designLanguage } = useDesignLanguage();

  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(category.name);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [draftTarget, setDraftTarget] = useState(category.targetPercentage.toString());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const items = getItemsForCategory(state, category.id);
  const total = getTotalForCategory(category.id);
  const totalIncome = getTotalIncome();
  const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
  const percentage = totalIncome > 0 ? (total / totalIncome) * 100 : 0;
  const target = category.targetPercentage;
  const allCategories = getSortedCategories(state);

  const { setNodeRef, isOver } = useDroppable({
    id: `zone:${category.id}`,
    data: { type: "zone", categoryId: category.id },
  });

  useEffect(() => {
    if (isRenaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [isRenaming]);

  const commitRename = () => {
    const trimmed = draftName.trim();
    if (trimmed) renameCategory(category.id, trimmed);
    else setDraftName(category.name);
    setIsRenaming(false);
  };

  const commitTarget = () => {
    const value = Math.max(0, Math.min(100, Number(draftTarget) || 0));
    updateCategoryTarget(category.id, value);
    setIsEditingTarget(false);
  };

  const moveCategory = (direction: -1 | 1) => {
    const ids = allCategories.map((c) => c.id);
    const index = ids.indexOf(category.id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    reorderCategories(ids);
  };

  const otherCategories = allCategories.filter((c) => c.id !== category.id);

  return (
    <>
      <Card
        ref={setNodeRef}
        className="flex flex-col h-full transition-shadow"
        style={{
          borderTopColor: color,
          borderTopWidth: "3px",
          boxShadow: isOver ? `0 0 0 2px ${color}` : undefined,
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  ref={renameInputRef}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") {
                      setDraftName(category.name);
                      setIsRenaming(false);
                    }
                  }}
                  className="h-8 text-base"
                  aria-label="Category name"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={commitRename} aria-label="Save name">
                  <Check className="size-4 text-green-600" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraftName(category.name);
                  setIsRenaming(true);
                }}
                className="group flex items-center gap-1.5 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                aria-label={`Rename ${category.name}`}
              >
                <CardTitle className="text-lg font-semibold truncate">
                  {category.name}
                </CardTitle>
                <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`${category.name} options`}>
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{category.name}</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => { setDraftName(category.name); setIsRenaming(true); }}>
                  <Pencil className="size-4" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setDraftTarget(target.toString()); setIsEditingTarget(true); }}>
                  <Check className="size-4" /> Set target…
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isFirst} onSelect={() => moveCategory(-1)}>
                  <ChevronLeft className="size-4" /> Move left
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLast} onSelect={() => moveCategory(1)}>
                  <ChevronRight className="size-4" /> Move right
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" /> Delete category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            {isEditingTarget ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draftTarget}
                  onChange={(e) => setDraftTarget(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTarget();
                    if (e.key === "Escape") setIsEditingTarget(false);
                  }}
                  className="h-7 w-20 text-sm"
                  aria-label="Target percentage"
                  autoFocus
                />
                <span className="text-sm text-muted-foreground">%</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commitTarget} aria-label="Save target">
                  <Check className="size-3.5 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingTarget(false)} aria-label="Cancel">
                  <X className="size-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setDraftTarget(target.toString()); setIsEditingTarget(true); }}
                className="text-xs font-medium px-2 py-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: `${color}20`, color }}
                aria-label="Edit target percentage"
              >
                Target: {target}%
              </button>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold">{formatCurrency(total)}</span>
            {percentage > 0 && (
              <span
                className="text-sm font-medium"
                style={{ color: percentage > target ? "#ef4444" : color }}
              >
                ({percentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-64 min-h-12">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isOver ? "Drop here" : "No items yet"}
              </p>
            ) : (
              items.map((item) =>
                editingItemId === item.id ? (
                  <BudgetInput
                    key={`edit-${item.id}`}
                    target={{ type: "category", categoryId: category.id }}
                    item={item}
                    onClose={() => setEditingItemId(null)}
                  />
                ) : (
                  <SortableItemRow
                    key={item.id}
                    item={item}
                    color={color}
                    onEdit={() => setEditingItemId(item.id)}
                    onRemove={() => removeBudgetItem(item.id)}
                    moveMenu={
                      <MoveItemMenu
                        item={item}
                        categories={otherCategories}
                        onMove={(targetId) => moveBudgetItem(item.id, targetId)}
                      />
                    }
                  />
                )
              )
            )}
          </div>

          <AnimatePresence mode="wait">
            {isAdding ? (
              <BudgetInput
                key="input"
                target={{ type: "category", categoryId: category.id }}
                onClose={() => setIsAdding(false)}
              />
            ) : (
              <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.06 }}>
                <Button
                  variant="outline"
                  className="w-full mt-auto"
                  onClick={() => setIsAdding(true)}
                  style={{ borderColor: color, color }}
                >
                  + Add Item
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <DeleteCategoryDialog
        open={confirmDelete}
        categoryName={category.name}
        itemCount={items.length}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={(behavior) => {
          setConfirmDelete(false);
          deleteCategory(category.id, behavior);
        }}
      />
    </>
  );
});

function MoveItemMenu({
  item,
  categories,
  onMove,
}: {
  item: BudgetLineItem;
  categories: BudgetCategory[];
  onMove: (categoryId: string | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground/50 hover:text-foreground transition-colors px-0.5 shrink-0"
          aria-label={`Move ${item.label}`}
        >
          <MoreVertical className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Move to…</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {categories.map((category) => (
              <DropdownMenuItem key={category.id} onSelect={() => onMove(category.id)}>
                {category.name}
              </DropdownMenuItem>
            ))}
            {item.categoryId !== null && (
              <DropdownMenuItem onSelect={() => onMove(null)}>
                Unassigned
              </DropdownMenuItem>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DeleteCategoryDialog({
  open,
  categoryName,
  itemCount,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  categoryName: string;
  itemCount: number;
  onCancel: () => void;
  onConfirm: (behavior: "keep" | "delete") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete “{categoryName}”?</DialogTitle>
          <DialogDescription>
            {itemCount > 0
              ? `This category has ${itemCount} item${itemCount === 1 ? "" : "s"}. Choose what to do with them.`
              : "This category has no items."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:flex-col sm:items-stretch sm:gap-2">
          {itemCount > 0 ? (
            <>
              <Button onClick={() => onConfirm("keep")}>
                Delete category, keep items as Unassigned
              </Button>
              <Button variant="destructive" onClick={() => onConfirm("delete")}>
                Delete category and its items
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => onConfirm("delete")}>
                Delete category
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Income card
// ---------------------------------------------------------------------------

export const IncomeCard = memo(function IncomeCard() {
  const { state, getTotalIncome, removeIncomeItem } = useBudget();
  const { designLanguage } = useDesignLanguage();
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const items = getSortedIncomeItems(state);
  const total = getTotalIncome();
  const color = getIncomeColor(designLanguage);

  return (
    <Card className="flex flex-col h-full" style={{ borderTopColor: color, borderTopWidth: "3px" }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="size-4" style={{ color }} />
            Income
          </CardTitle>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold">{formatCurrency(total)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-64 min-h-12">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No income yet</p>
          ) : (
            items.map((item: IncomeItem) =>
              editingItemId === item.id ? (
                <BudgetInput
                  key={`edit-${item.id}`}
                  target={{ type: "income" }}
                  item={item}
                  onClose={() => setEditingItemId(null)}
                  placeholder="e.g., Salary…"
                />
              ) : (
                <div
                  key={item.id}
                  className="flex items-center gap-1 p-2 bg-muted/30 rounded-md group hover:bg-muted/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setEditingItemId(item.id)}
                    className="flex-1 min-w-0 text-left flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    aria-label={`Edit ${item.label}: ${formatCurrency(item.amount)}`}
                  >
                    <span className="text-sm font-medium truncate">{item.label}</span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {formatCurrency(item.amount)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeIncomeItem(item.id)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors text-lg leading-none px-1 shrink-0"
                    aria-label={`Remove ${item.label}`}
                  >
                    ×
                  </button>
                </div>
              )
            )
          )}
        </div>
        <AnimatePresence mode="wait">
          {isAdding ? (
            <BudgetInput key="input" target={{ type: "income" }} onClose={() => setIsAdding(false)} placeholder="e.g., Salary…" />
          ) : (
            <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.06 }}>
              <Button variant="outline" className="w-full mt-auto" onClick={() => setIsAdding(true)} style={{ borderColor: color, color }}>
                + Add Income
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Unassigned card
// ---------------------------------------------------------------------------

export const UnassignedCard = memo(function UnassignedCard() {
  const { state, getTotalForCategory, removeBudgetItem, moveBudgetItem } = useBudget();
  const { designLanguage } = useDesignLanguage();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const items = getUnassignedItems(state);
  const total = getTotalForCategory(null);
  const color = getUnassignedColor(designLanguage);
  const categories = getSortedCategories(state);

  const { setNodeRef, isOver } = useDroppable({
    id: "zone:unassigned",
    data: { type: "zone", categoryId: null },
  });

  return (
    <Card
      ref={setNodeRef}
      className="flex flex-col h-full border-dashed transition-shadow"
      style={{
        borderTopColor: color,
        borderTopWidth: "3px",
        boxShadow: isOver ? `0 0 0 2px ${color}` : undefined,
      }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
          <Inbox className="size-4" />
          Unassigned
        </CardTitle>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold">{formatCurrency(total)}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 space-y-2 overflow-y-auto max-h-64 min-h-12">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isOver ? "Drop here" : "Drag budgets here to unassign them"}
            </p>
          ) : (
            items.map((item) =>
              editingItemId === item.id ? (
                <BudgetInput
                  key={`edit-${item.id}`}
                  target={{ type: "category", categoryId: null }}
                  item={item}
                  onClose={() => setEditingItemId(null)}
                />
              ) : (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  color={color}
                  onEdit={() => setEditingItemId(item.id)}
                  onRemove={() => removeBudgetItem(item.id)}
                  moveMenu={
                    <MoveItemMenu
                      item={item}
                      categories={categories}
                      onMove={(targetId) => moveBudgetItem(item.id, targetId)}
                    />
                  }
                />
              )
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// ---------------------------------------------------------------------------
// Add-category card
// ---------------------------------------------------------------------------

export const AddCategoryCard = memo(function AddCategoryCard() {
  const { addCategory } = useBudget();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      addCategory(trimmed);
      setName("");
      setIsAdding(false);
    }
  };

  return (
    <Card className="flex flex-col h-full border-dashed items-center justify-center min-h-44">
      <CardContent className="flex flex-col items-center justify-center gap-3 p-6 w-full">
        {isAdding ? (
          <div className="w-full space-y-2">
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setName("");
                  setIsAdding(false);
                }
              }}
              placeholder="Category name…"
              aria-label="New category name"
              className="h-9"
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={commit}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setName(""); setIsAdding(false); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="flex flex-col h-auto gap-2 py-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="size-6" />
            <span>Add category</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
});
