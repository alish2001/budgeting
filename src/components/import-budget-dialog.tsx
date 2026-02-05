"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudget } from "@/lib/budget-context";
import { useDesignLanguage } from "@/lib/design-language-context";
import {
  decodeBudget,
  getBudgetCodeFromUrl,
  clearBudgetFromUrl,
  getBudgetPreview,
} from "@/lib/budget-serialization";
import { formatCurrency } from "@/lib/utils";
import { getCategoryColor } from "@/lib/design-language";
import {
  Download,
  AlertCircle,
  Check,
  FileDown,
  Loader2,
  Copy,
  ClipboardPaste,
} from "lucide-react";

interface ImportBudgetDialogProps {
  defaultOpen?: boolean;
  initialCode?: string;
}

// Subscribe to URL changes (no-op since URL doesn't change without page navigation)
const emptySubscribe = () => () => {};

function getUrlCodeSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return getBudgetCodeFromUrl();
}

function getUrlCodeServerSnapshot(): string | null {
  return null;
}

export function ImportBudgetDialog({
  defaultOpen = false,
  initialCode = "",
}: ImportBudgetDialogProps) {
  const { importBudget, isHydrated } = useBudget();
  const { designLanguage } = useDesignLanguage();

  // Read URL code using useSyncExternalStore (runs once on mount, stable reference)
  const urlCode = useSyncExternalStore(
    emptySubscribe,
    getUrlCodeSnapshot,
    getUrlCodeServerSnapshot
  );

  // Initialize state - use urlCode directly in initializer (computed once)
  const [isOpen, setIsOpen] = useState(
    () => defaultOpen || (urlCode !== null)
  );
  const [code, setCode] = useState(
    () => initialCode || urlCode || ""
  );
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Validate and preview the budget code (computed during render)
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

  const { preview, error } = validationResult;
  const previewData = preview ? getBudgetPreview(preview) : null;
  const needsColor = getCategoryColor("needs", designLanguage);
  const wantsColor = getCategoryColor("wants", designLanguage);
  const savingsColor = getCategoryColor("savings", designLanguage);
  const incomeColor = getCategoryColor("income", designLanguage);

  const handleImport = () => {
    if (!preview) return;

    setIsImporting(true);

    // Small delay for visual feedback
    setTimeout(() => {
      importBudget(preview);
      clearBudgetFromUrl();
      setIsImporting(false);
      setImportSuccess(true);

      // Close dialog after success message
      setTimeout(() => {
        setIsOpen(false);
        setCode("");
        setImportSuccess(false);
      }, 1500);
    }, 300);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Clear URL param when closing without importing
      clearBudgetFromUrl();
      setCode("");
      setImportSuccess(false);
      setCopiedCode(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text.trim());
    } catch (err) {
      console.error("Failed to paste from clipboard:", err);
    }
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  if (!isHydrated) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Import Budget
          </DialogTitle>
          <DialogDescription>
            Paste a budget code or link to import a saved budget configuration.
            This will replace your current budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="budget-code">Budget Code</Label>
            <div className="flex gap-2">
              <Input
                id="budget-code"
                placeholder="Paste your budget code here…"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-xs min-w-0"
                disabled={isImporting || importSuccess}
                autoComplete="off"
                spellCheck={false}
              />
              {code ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  className="shrink-0"
                  disabled={isImporting || importSuccess}
                  aria-label={copiedCode ? "Code copied" : "Copy code"}
                >
                  <AnimatePresence mode="wait">
                    {copiedCode ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePasteFromClipboard}
                  className="shrink-0"
                  disabled={isImporting || importSuccess}
                  aria-label="Paste from clipboard"
                >
                  <ClipboardPaste className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-sm text-destructive"
              >
                <AlertCircle className="h-4 w-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message */}
          <AnimatePresence>
            {importSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
              >
                <Check className="h-4 w-4" />
                Budget imported successfully!
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          <AnimatePresence>
            {previewData && !importSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Budget Preview</h4>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Total Income
                      </p>
                      <p
                        className="font-semibold"
                        style={{ color: incomeColor }}
                      >
                        {formatCurrency(previewData.totalIncome)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p
                        className="text-xs"
                        style={{ color: needsColor }}
                      >
                        Needs ({previewData.itemCounts.needs} items)
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(previewData.totalNeeds)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p
                        className="text-xs"
                        style={{ color: wantsColor }}
                      >
                        Wants ({previewData.itemCounts.wants} items)
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(previewData.totalWants)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p
                        className="text-xs"
                        style={{ color: savingsColor }}
                      >
                        Savings ({previewData.itemCounts.savings} items)
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(previewData.totalSavings)}
                      </p>
                    </div>
                  </div>

                  {previewData.hasCustomTargets && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Targets:{" "}
                        <span className="font-medium">
                          {previewData.targets.needs}/
                          {previewData.targets.wants}/
                          {previewData.targets.savings}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview || isImporting || importSuccess}
            className="gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : importSuccess ? (
              <>
                <Check className="h-4 w-4" />
                Imported
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Import Budget
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
