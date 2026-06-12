"use client";

import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Check,
  CornerDownRight,
  Target,
  TriangleAlert,
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
  getCategoriesInTreeOrder,
  getCategoryPathLabel,
  getChildCategories,
  getDescendantCategoryIds,
  getItemsForCategory,
  getSortedIncomeItems,
  getTopLevelCategories,
  getUnassignedItems,
  hasChildTargetOverflow,
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
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none shrink-0 p-1.5 -m-1"
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
    getSubtreeTotalForCategory,
    getEffectiveTargetForCategory,
    getTotalIncome,
    removeBudgetItem,
    moveBudgetItem,
    addCategory,
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
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const items = getItemsForCategory(state, category.id);
  const directTotal = getTotalForCategory(category.id);
  const total = getSubtreeTotalForCategory(category.id);
  const totalIncome = getTotalIncome();
  const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
  const percentage = totalIncome > 0 ? (total / totalIncome) * 100 : 0;
  const target = category.targetPercentage;
  const effectiveTarget = getEffectiveTargetForCategory(category.id);
  const childCategories = getChildCategories(state, category.id);
  const showTargetOverflow = hasChildTargetOverflow(state, category.id);
  const topLevelCategories = getTopLevelCategories(state);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `zone:${category.id}`,
    data: { type: "zone", categoryId: category.id },
  });
  // Top-level cards drag too: drop one onto another category to nest it.
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `cat:${category.id}`,
    data: { type: "category", categoryId: category.id },
  });
  const setRefs = (node: HTMLElement | null) => {
    setDroppableRef(node);
    setDraggableRef(node);
  };

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

  const moveCard = (direction: -1 | 1) => {
    const ids = topLevelCategories.map((c) => c.id);
    const index = ids.indexOf(category.id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    reorderCategories(null, ids);
  };

  return (
    <>
      <Card
        ref={setRefs}
        className="flex flex-col h-full transition-shadow"
        style={{
          borderTopColor: color,
          borderTopWidth: "3px",
          boxShadow: isOver ? `0 0 0 2px ${color}` : undefined,
          opacity: isDragging ? 0.4 : 1,
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none shrink-0 p-3 -m-2.5"
              aria-label={`Drag ${category.name} category`}
              {...dragAttributes}
              {...dragListeners}
            >
              <GripVertical className="size-4" />
            </button>
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
                <DropdownMenuItem onSelect={() => setIsAddingSubcategory(true)}>
                  <CornerDownRight className="size-4" /> Add subcategory…
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isFirst} onSelect={() => moveCard(-1)}>
                  <ChevronLeft className="size-4" /> Move left
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLast} onSelect={() => moveCard(1)}>
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
                {effectiveTarget !== target && (
                  <span className="opacity-75"> ({effectiveTarget}% with subcategories)</span>
                )}
              </button>
            )}
          </div>

          {showTargetOverflow && (
            <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              <TriangleAlert className="size-3.5 shrink-0" />
              Subcategory targets ({effectiveTarget - target}%) exceed this category&apos;s target ({target}%)
            </p>
          )}

          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold">{formatCurrency(total)}</span>
            {percentage > 0 && (
              <span
                className="text-sm font-medium"
                style={{ color: percentage > effectiveTarget ? "#ef4444" : color }}
              >
                ({percentage.toFixed(1)}%)
              </span>
            )}
          </div>
          {total !== directTotal && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct: {formatCurrency(directTotal)} · Subcategories: {formatCurrency(total - directTotal)}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          {/* Items and subcategory cards share one list: a subcategory is a
              "card within the card", a peer of the items around it.
              Subcategories render first so the hierarchy reads top-down,
              with the category's direct line items after them. */}
          <div
            className={`flex-1 space-y-2 mb-4 overflow-y-auto min-h-12 ${
              childCategories.length > 0 ? "max-h-[28rem]" : "max-h-64"
            }`}
          >
            {childCategories.map((child) => (
              <SubcategoryCard key={child.id} category={child} depth={1} />
            ))}

            {isAddingSubcategory && (
              <AddSubcategoryInput
                onAdd={(name) => addCategory(name, { parentCategoryId: category.id })}
                onClose={() => setIsAddingSubcategory(false)}
              />
            )}

            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) =>
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
                        onMove={(targetId) => moveBudgetItem(item.id, targetId)}
                      />
                    }
                  />
                )
              )}
            </SortableContext>

            {items.length === 0 && childCategories.length === 0 && !isAddingSubcategory && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {isOver ? "Drop here" : "No items yet"}
              </p>
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
        subcategoryCount={getDescendantCategoryIds(state.categories, category.id).length}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={(behavior, childBehavior) => {
          setConfirmDelete(false);
          deleteCategory(category.id, behavior, childBehavior);
        }}
      />
    </>
  );
});

// ---------------------------------------------------------------------------
// Subcategory card (recursive "card within a card")
//
// A subcategory renders as a peer of the items around it: a draggable
// mini-card. Dragging it onto another category (or subcategory) re-parents
// it, carrying its whole subtree of items and children along.
// ---------------------------------------------------------------------------

function SubcategoryCard({
  category,
  depth,
}: {
  category: BudgetCategory;
  depth: number;
}) {
  const {
    state,
    getSubtreeTotalForCategory,
    getEffectiveTargetForCategory,
    removeBudgetItem,
    moveBudgetItem,
    addCategory,
    renameCategory,
    deleteCategory,
    updateCategoryTarget,
    reorderCategories,
  } = useBudget();
  const { designLanguage } = useDesignLanguage();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(category.name);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [draftTarget, setDraftTarget] = useState(category.targetPercentage.toString());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const items = getItemsForCategory(state, category.id);
  const total = getSubtreeTotalForCategory(category.id);
  const color = resolveCategoryColor(category.colorToken, category.sortOrder, designLanguage);
  const target = category.targetPercentage;
  const effectiveTarget = getEffectiveTargetForCategory(category.id);
  const childCategories = getChildCategories(state, category.id);
  const parentId = category.parentCategoryId ?? null;
  const siblings = getChildCategories(state, parentId);
  const siblingIndex = siblings.findIndex((sibling) => sibling.id === category.id);
  const showTargetOverflow = hasChildTargetOverflow(state, category.id);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `zone:${category.id}`,
    data: { type: "zone", categoryId: category.id },
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    isDragging,
  } = useDraggable({
    id: `cat:${category.id}`,
    data: { type: "category", categoryId: category.id },
  });
  const setRefs = (node: HTMLElement | null) => {
    setDroppableRef(node);
    setDraggableRef(node);
  };

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

  const moveSibling = (direction: -1 | 1) => {
    const ids = siblings.map((sibling) => sibling.id);
    const swapWith = siblingIndex + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[siblingIndex], ids[swapWith]] = [ids[swapWith], ids[siblingIndex]];
    reorderCategories(parentId, ids);
  };

  return (
    <>
      <div
        ref={setRefs}
        className="rounded-lg border border-border/70 bg-card/60 transition-shadow"
        style={{
          borderLeftColor: color,
          borderLeftWidth: "3px",
          boxShadow: isOver ? `0 0 0 2px ${color}` : undefined,
          opacity: isDragging ? 0.4 : 1,
        }}
      >
        <div className="flex items-center gap-1 p-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none shrink-0 p-3 -m-2.5"
            aria-label={`Drag ${category.name} subcategory`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-muted-foreground/60 hover:text-foreground shrink-0"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name}`}
          >
            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>

          {isRenaming ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
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
                className="h-7 text-sm"
                aria-label="Category name"
              />
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={commitRename} aria-label="Save name">
                <Check className="size-3.5 text-green-600" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(category.name);
                setIsRenaming(true);
              }}
              className="group flex items-center gap-1 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              aria-label={`Rename ${category.name}`}
            >
              <span className="text-sm font-semibold truncate" style={{ color }}>
                {category.name}
              </span>
              <Pencil className="size-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}

          <span className="text-sm font-semibold shrink-0">{formatCurrency(total)}</span>
          {target > 0 && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {target}%{effectiveTarget !== target ? ` (${effectiveTarget}%)` : ""}
            </span>
          )}
          {showTargetOverflow && (
            <TriangleAlert
              className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0"
              aria-label={`Subcategory targets exceed ${category.name}'s target`}
            />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" aria-label={`${category.name} options`}>
                <MoreVertical className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{category.name}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => { setDraftName(category.name); setIsRenaming(true); }}>
                <Pencil className="size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setDraftTarget(target.toString()); setIsEditingTarget(true); }}>
                <Target className="size-4" /> Set target…
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setIsExpanded(true); setIsAddingSubcategory(true); }}>
                <CornerDownRight className="size-4" /> Add subcategory…
              </DropdownMenuItem>
              <DropdownMenuItem disabled={siblingIndex <= 0} onSelect={() => moveSibling(-1)}>
                <ChevronUp className="size-4" /> Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={siblingIndex >= siblings.length - 1} onSelect={() => moveSibling(1)}>
                <ChevronDown className="size-4" /> Move down
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

        {isEditingTarget && (
          <div className="flex items-center gap-1 px-2 pb-2">
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
        )}

        {isExpanded && (
          <div className="px-2 pb-2 space-y-2">
            {childCategories.map((child) => (
              <SubcategoryCard key={child.id} category={child} depth={depth + 1} />
            ))}

            {isAddingSubcategory && (
              <AddSubcategoryInput
                onAdd={(name) => addCategory(name, { parentCategoryId: category.id })}
                onClose={() => setIsAddingSubcategory(false)}
              />
            )}

            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) =>
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
                        onMove={(targetId) => moveBudgetItem(item.id, targetId)}
                      />
                    }
                  />
                )
              )}
            </SortableContext>

            {items.length === 0 && childCategories.length === 0 && !isAdding && !isAddingSubcategory && (
              <p className="text-xs text-muted-foreground py-1">
                {isOver ? "Drop here" : "No items yet"}
              </p>
            )}

            {isAdding ? (
              <BudgetInput
                target={{ type: "category", categoryId: category.id }}
                onClose={() => setIsAdding(false)}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => setIsAdding(true)}
                style={{ borderColor: `${color}80`, color }}
              >
                + Add Item
              </Button>
            )}
          </div>
        )}
      </div>

      <DeleteCategoryDialog
        open={confirmDelete}
        categoryName={category.name}
        itemCount={items.length}
        subcategoryCount={getDescendantCategoryIds(state.categories, category.id).length}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={(behavior, childBehavior) => {
          setConfirmDelete(false);
          deleteCategory(category.id, behavior, childBehavior);
        }}
      />
    </>
  );
}

function AddSubcategoryInput({
  onAdd,
  onClose,
}: {
  onAdd: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) onAdd(trimmed);
    onClose();
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="Subcategory name…"
        aria-label="New subcategory name"
        className="h-8 text-sm"
      />
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={commit} aria-label="Add subcategory">
        <Check className="size-4 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onClose} aria-label="Cancel subcategory">
        <X className="size-4" />
      </Button>
    </div>
  );
}

function MoveItemMenu({
  item,
  onMove,
}: {
  item: BudgetLineItem;
  onMove: (categoryId: string | null) => void;
}) {
  const { state } = useBudget();
  const destinations = getCategoriesInTreeOrder(state).filter(
    ({ category }) => category.id !== item.categoryId,
  );

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
            {destinations.map(({ category }) => (
              <DropdownMenuItem key={category.id} onSelect={() => onMove(category.id)}>
                {getCategoryPathLabel(state, category.id)}
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
  subcategoryCount,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  categoryName: string;
  itemCount: number;
  subcategoryCount: number;
  onCancel: () => void;
  onConfirm: (
    behavior: "keep" | "delete",
    childBehavior: "promote" | "delete-subtree",
  ) => void;
}) {
  const [childBehavior, setChildBehavior] = useState<"promote" | "delete-subtree">("promote");

  const handleCancel = () => {
    setChildBehavior("promote");
    onCancel();
  };

  const handleConfirm = (behavior: "keep" | "delete") => {
    const chosen = childBehavior;
    setChildBehavior("promote");
    onConfirm(behavior, chosen);
  };

  const hasChildren = subcategoryCount > 0;
  const hasItems = itemCount > 0;
  const itemsLabel = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
  const subcategoriesLabel = `${subcategoryCount} ${subcategoryCount === 1 ? "subcategory" : "subcategories"}`;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Delete “{categoryName}”?</DialogTitle>
          <DialogDescription>
            {hasItems && hasChildren
              ? `This category has ${itemsLabel} and ${subcategoriesLabel}.`
              : hasItems
              ? `This category has ${itemsLabel}. Choose what to do with them.`
              : hasChildren
              ? `This category has ${subcategoriesLabel}.`
              : "This category has no items."}
          </DialogDescription>
        </DialogHeader>

        {hasChildren && (
          <div className="space-y-2" role="radiogroup" aria-label="What happens to subcategories">
            <button
              type="button"
              role="radio"
              aria-checked={childBehavior === "promote"}
              onClick={() => setChildBehavior("promote")}
              className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                childBehavior === "promote"
                  ? "border-ring bg-accent/50"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="font-medium">Promote subcategories up a level</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                They keep their items and move to where “{categoryName}” was.
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={childBehavior === "delete-subtree"}
              onClick={() => setChildBehavior("delete-subtree")}
              className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                childBehavior === "delete-subtree"
                  ? "border-destructive bg-destructive/10"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="font-medium">Delete the whole subtree</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                All {subcategoryCount === 1 ? "1 subcategory is" : `${subcategoryCount} subcategories are`} deleted; the item choice below applies to their items too.
              </span>
            </button>
          </div>
        )}

        <DialogFooter className="sm:flex-col sm:items-stretch sm:gap-2">
          {hasItems || hasChildren ? (
            <>
              <Button onClick={() => handleConfirm("keep")}>
                Delete category, keep items as Unassigned
              </Button>
              <Button variant="destructive" onClick={() => handleConfirm("delete")}>
                Delete category and its items
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="destructive" onClick={() => handleConfirm("delete")}>
                Delete category
              </Button>
              <Button variant="outline" onClick={handleCancel}>
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
