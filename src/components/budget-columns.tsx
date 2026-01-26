"use client";

import { motion } from "framer-motion";
import { BudgetColumn } from "@/components/budget-column";
import { CategoryName } from "@/types/budget";

const CATEGORIES: CategoryName[] = ["income", "needs", "wants", "savings"];

export function BudgetColumns() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {CATEGORIES.map((category, index) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: index * 0.1,
            ease: "easeOut",
          }}
        >
          <BudgetColumn category={category} />
        </motion.div>
      ))}
    </div>
  );
}

