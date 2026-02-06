import { CategoryName, BudgetItem } from "@/types/budget";

// Mode state machine types
export type PaletteMode =
  | { type: "default" }
  | { type: "add"; category: CategoryName }
  | { type: "edit-search"; category?: CategoryName }
  | { type: "edit-form"; category: CategoryName; item: BudgetItem }
  | { type: "remove-search"; category?: CategoryName }
  | { type: "confirm-clear" }
  | { type: "share" }
  | { type: "import" }
  | { type: "switch-budget" }
  | { type: "save-budget" }
  | { type: "rename-budget" }
  | { type: "rename-saved-budget" }
  | { type: "delete-saved-budget" };
