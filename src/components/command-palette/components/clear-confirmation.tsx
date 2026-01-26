"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

interface ClearConfirmationProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearConfirmation({ onConfirm, onCancel }: ClearConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className="p-6 text-center"
    >
      <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <Trash2 className="size-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Clear All Budget Data?</h3>
      <p className="text-sm text-muted-foreground mb-6">
        This will permanently delete all your income, needs, wants, and savings items.
        This action cannot be undone.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onCancel}
          className="h-9 px-4 bg-muted text-foreground rounded-md font-medium text-sm hover:bg-muted/80 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="h-9 px-4 bg-destructive text-destructive-foreground rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Clear All
        </button>
      </div>
    </motion.div>
  );
}
