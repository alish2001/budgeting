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
import { getSortedCategories, getUnassignedItems } from "@/lib/budget-plan";
import {
  CategoryCard,
  IncomeCard,
  UnassignedCard,
  AddCategoryCard,
} from "@/components/budget-column";
import { formatCurrency } from "@/lib/utils";

export function BudgetColumns() {
  const { state, moveBudgetItem } = useBudget();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const categories = useMemo(() => getSortedCategories(state), [state]);
  const unassigned = useMemo(() => getUnassignedItems(state), [state]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeItem = activeItemId
    ? state.budgetItems.find((item) => item.id === activeItemId) ?? null
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItemId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItemId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

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
      onDragCancel={() => setActiveItemId(null)}
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
            <SortableContext
              items={state.budgetItems
                .filter((item) => item.categoryId === category.id)
                .map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <CategoryCard
                category={category}
                isFirst={index === 0}
                isLast={index === categories.length - 1}
              />
            </SortableContext>
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
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
