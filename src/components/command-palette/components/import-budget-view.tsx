"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Download,
  ArrowLeft,
  ClipboardPaste,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { formatCurrency } from "@/lib/utils";
import {
  decodeBudget,
  getBudgetCodeFromUrl,
  clearBudgetFromUrl,
  getBudgetPreview,
} from "@/lib/budget-serialization";
import { KeyboardShortcut } from "./keyboard-shortcut";

interface ImportBudgetViewProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export function ImportBudgetView({ onCancel, onSuccess }: ImportBudgetViewProps) {
  const { importBudget } = useBudget();
  // Initialize with URL code if present
  const [code, setCode] = useState(() => {
    if (typeof window !== "undefined") {
      return getBudgetCodeFromUrl() || "";
    }
    return "";
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const validationResult = useMemo(() => {
    if (!code.trim()) {
      return { preview: null, error: null };
    }
    const decoded = decodeBudget(code.trim());
    if (decoded) {
      return { preview: decoded, error: null };
    }
    return {
      preview: null,
      error: "Invalid budget code. Please check and try again.",
    };
  }, [code]);

  const { preview, error: validationError } = validationResult;
  const previewData = preview ? getBudgetPreview(preview) : null;

  const handleImport = () => {
    if (!preview) return;

    setIsImporting(true);

    setTimeout(() => {
      importBudget(preview);
      clearBudgetFromUrl();
      setIsImporting(false);
      setImportSuccess(true);

      setTimeout(() => {
        onSuccess();
      }, 1000);
    }, 300);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text.trim());
    } catch (err) {
      console.error("Failed to paste from clipboard:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.12 }}
      className="p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onCancel}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h3 className="font-semibold flex items-center gap-2">
          <Download className="size-4" />
          Import Budget
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Budget Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
              }}
              placeholder="Paste your budget code here…"
              className="flex-1 h-9 px-3 text-xs font-mono rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring/50"
              disabled={isImporting || importSuccess}
              autoFocus
            />
            {!code && (
              <button
                onClick={handlePasteFromClipboard}
                className="h-9 w-9 flex items-center justify-center border border-input rounded-md hover:bg-muted transition-colors shrink-0"
                aria-label="Paste from clipboard"
              >
                <ClipboardPaste className="size-4" />
              </button>
            )}
          </div>
        </div>

        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-destructive"
          >
            <AlertCircle className="size-3.5" />
            {validationError}
          </motion.div>
        )}

        {importSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400"
          >
            <Check className="size-3.5" />
            Budget imported successfully!
          </motion.div>
        )}

        {previewData && !importSuccess && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-md border border-border bg-muted/30 p-3 space-y-2"
          >
            <h4 className="text-xs font-semibold">Budget Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Income</p>
                <p className="font-semibold text-purple-600 dark:text-purple-400">
                  {formatCurrency(previewData.totalIncome)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Items</p>
                <p className="font-semibold">
                  {previewData.itemCounts.needs +
                    previewData.itemCounts.wants +
                    previewData.itemCounts.savings +
                    previewData.itemCounts.income}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="h-9 px-4 bg-muted text-foreground rounded-md font-medium text-sm hover:bg-muted/80 transition-colors"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!preview || isImporting || importSuccess}
            className="h-9 px-4 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Importing…
              </>
            ) : importSuccess ? (
              <>
                <Check className="size-4" />
                Imported
              </>
            ) : (
              <>
                <Download className="size-4" />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
