"use client";

import { BudgetColumn } from "./budget-column";
import { CategoryName } from "@/types/budget";

const CATEGORIES: CategoryName[] = ["needs", "wants", "savings"];

export function BudgetColumns() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {CATEGORIES.map((category) => (
        <BudgetColumn key={category} category={category} />
      ))}
    </div>
  );
}

