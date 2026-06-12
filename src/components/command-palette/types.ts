export type AddTarget =
  | { type: "income" }
  | { type: "category"; categoryId: string };

export interface PaletteEditableItem {
  id: string;
  label: string;
  amount: number;
}

// Mode state machine types
export type PaletteMode =
  | { type: "default" }
  | { type: "add-pick-category" }
  | { type: "add"; target: AddTarget }
  | { type: "edit-search" }
  | {
      type: "edit-form";
      itemKind: "income" | "budget";
      item: PaletteEditableItem;
    }
  | { type: "remove-search" }
  | { type: "move-item-search" }
  | { type: "move-item-target"; itemId: string; itemLabel: string }
  | { type: "add-category" }
  | { type: "add-subcategory-pick" }
  | { type: "add-subcategory"; parentId: string; parentLabel: string }
  | { type: "move-category-pick" }
  | { type: "move-category-target"; categoryId: string; categoryLabel: string }
  | { type: "rename-category-pick" }
  | { type: "rename-category"; categoryId: string }
  | { type: "delete-category-pick" }
  | { type: "delete-category-confirm"; categoryId: string }
  | { type: "set-target-pick" }
  | { type: "set-target"; categoryId: string }
  | { type: "confirm-clear" }
  | { type: "share" }
  | { type: "import" }
  | { type: "switch-budget" }
  | { type: "save-budget" }
  | { type: "rename-budget" }
  | { type: "rename-saved-budget" }
  | { type: "delete-saved-budget" };
