"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useBudget } from "@/lib/budget-context";
import {
  getCategoryById,
  getTopLevelCategories,
  getUnassignedItems,
} from "@/lib/budget-plan";
import { useDesignLanguage } from "@/lib/design-language-context";
import { resolveCategoryColor } from "@/lib/design-language";
import {
  CategoryCard,
  IncomeCard,
  UnassignedCard,
  AddCategoryCard,
} from "@/components/budget-column";
import { formatCurrency } from "@/lib/utils";

export function BudgetColumns() {
  const { state, moveBudgetItem, moveCategory, getSubtreeTotalForCategory } = useBudget();
  const { designLanguage } = useDesignLanguage();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const categories = useMemo(() => getTopLevelCategories(state), [state]);
  const unassigned = useMemo(() => getUnassignedItems(state), [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeItem = activeDragId
    ? state.budgetItems.find((item) => item.id === activeDragId) ?? null
    : null;
  // Subcategory cards drag with a "cat:" prefix so they can't collide with item ids.
  const activeCategory = activeDragId?.startsWith("cat:")
    ? getCategoryById(state, activeDragId.slice("cat:".length))
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // Dragging a subcategory card: re-parent it (its whole subtree of items
    // and children moves along). moveCategory no-ops on cycles.
    if (activeId.startsWith("cat:")) {
      const categoryId = activeId.slice("cat:".length);
      let newParentId: string | null | undefined;
      if (overId.startsWith("zone:")) {
        const key = overId.slice("zone:".length);
        // Dropping on the Unassigned lane promotes it to a top-level card.
        newParentId = key === "unassigned" ? null : key;
      } else {
        // Dropped onto an item row: join that item's category.
        const overItem = state.budgetItems.find((item) => item.id === overId);
        newParentId = overItem ? overItem.categoryId : undefined;
      }
      if (newParentId !== undefined) {
        moveCategory(categoryId, newParentId);
      }
      return;
    }

    // Dropping onto a zone (empty area of a category / unassigned).
    if (overId.startsWith("zone:")) {
      const key = overId.slice("zone:".length);
      const targetCategoryId = key === "unassigned" ? null : key;
      moveBudgetItem(activeId, targetCategoryId);
      return;
    }

    // Dropping onto another item: adopt that item's category and position.
    const overItem = state.budgetItems.find((item) => item.id === overId);
    if (!overItem) return;

    const siblings = state.budgetItems
      .filter((item) => item.categoryId === overItem.categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const targetIndex = siblings.findIndex((item) => item.id === overId);

    moveBudgetItem(activeId, overItem.categoryId, targetIndex);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <IncomeCard />
        </motion.div>

        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: (index + 1) * 0.05, ease: "easeOut" }}
          >
            {/* Each card / subcategory section owns its SortableContext. */}
            <CategoryCard
              category={category}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
            />
          </motion.div>
        ))}

        {(unassigned.length > 0 || activeItem !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <SortableContext
              items={unassigned.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <UnassignedCard />
            </SortableContext>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: (categories.length + 1) * 0.05, ease: "easeOut" }}
        >
          <AddCategoryCard />
        </motion.div>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="flex items-center justify-between gap-2 p-2 bg-popover border border-border rounded-md shadow-lg">
            <span className="text-sm font-medium truncate">{activeItem.label}</span>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(activeItem.amount)}
            </span>
          </div>
        ) : activeCategory ? (
          <div
            className="flex items-center justify-between gap-2 p-2 bg-popover border border-border rounded-lg shadow-lg"
            style={{
              borderLeftColor: resolveCategoryColor(
                activeCategory.colorToken,
                activeCategory.sortOrder,
                designLanguage,
              ),
              borderLeftWidth: "3px",
            }}
          >
            <span className="text-sm font-semibold truncate">{activeCategory.name}</span>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(getSubtreeTotalForCategory(activeCategory.id))}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
