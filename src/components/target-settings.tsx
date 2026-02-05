"use client";

import { useEffect, useMemo, useRef, useState, useEffectEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  CATEGORY_CONFIG,
  SpendingCategoryName,
  TargetPercentages,
} from "@/types/budget";
import { useBudget } from "@/lib/budget-context";
import { useDesignLanguage } from "@/lib/design-language-context";
import { getCategoryColor } from "@/lib/design-language";
import {
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  Save,
  Equal,
  Check,
  Loader2,
} from "lucide-react";

const CATEGORIES: SpendingCategoryName[] = ["needs", "wants", "savings"];

export function TargetSettings() {
  const { state, updateTargetPercentages, resetTargetPercentages } =
    useBudget();
  const { designLanguage } = useDesignLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<TargetPercentages>(
    state.targetPercentages
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevTargetPercentagesRef = useRef(state.targetPercentages);

  // Sync draft when state changes externally (e.g., after reset)
  const syncDraftFromState = useEffectEvent((current: TargetPercentages) => {
    const prev = prevTargetPercentagesRef.current;
    if (
      prev.needs !== current.needs ||
      prev.wants !== current.wants ||
      prev.savings !== current.savings
    ) {
      setDraft(current);
      prevTargetPercentagesRef.current = current;
    }
  });

  useEffect(() => {
    syncDraftFromState(state.targetPercentages);
  }, [state.targetPercentages]);

  const total = useMemo(
    () => draft.needs + draft.wants + draft.savings,
    [draft]
  );

  const isValid = total === 100;

  const updateValue = (category: SpendingCategoryName, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setDraft((prev) => ({ ...prev, [category]: clamped }));
  };

  const handleSave = () => {
    if (!isValid || isSaving) return;

    setIsSaving(true);

    // Simulate async save operation with visual feedback
    setTimeout(() => {
      updateTargetPercentages(draft);
      setIsSaving(false);
      setShowSuccess(true);

      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }, 300);
  };

  const handleReset = () => {
    if (isResetting) return;

    setIsResetting(true);

    setTimeout(() => {
      resetTargetPercentages();
      setIsResetting(false);
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }, 300);
  };

  const handleEvenlyDistribute = () => {
    if (total >= 100 || isDistributing) return;

    setIsDistributing(true);

    // Small delay for visual feedback
    setTimeout(() => {
      const remaining = 100 - total;

      // Find the two categories with the smallest values
      const sorted = [
        { key: "needs" as SpendingCategoryName, value: draft.needs },
        { key: "wants" as SpendingCategoryName, value: draft.wants },
        { key: "savings" as SpendingCategoryName, value: draft.savings },
      ].sort((a, b) => a.value - b.value);

      // Distribute remaining evenly between the two smallest
      const distribution = remaining / 2;

      setDraft((prev) => {
        const updated = { ...prev };
        updated[sorted[0].key] = Math.max(
          0,
          Math.min(100, prev[sorted[0].key] + distribution)
        );
        updated[sorted[1].key] = Math.max(
          0,
          Math.min(100, prev[sorted[1].key] + distribution)
        );
        return updated;
      });

      setIsDistributing(false);
    }, 200);
  };

  return (
    <Card className="border border-border/80 bg-card">
      <CardHeader
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="target-settings-content"
        className="flex flex-row items-center justify-between py-3 cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <CardTitle className="text-base sm:text-lg font-semibold">
          Customize Budget Targets
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="gap-2"
        >
          {isOpen ? "Hide" : "Show"}
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            id="target-settings-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-5 pt-2 pb-5">
              <div className="space-y-4">
                {CATEGORIES.map((category, index) => {
                  const config = CATEGORY_CONFIG[category];
                  const categoryColor = getCategoryColor(category, designLanguage);
                  const value = draft[category];
                  return (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15, delay: 0.05 * index }}
                      className="space-y-2 rounded-lg border border-border/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: categoryColor }}
                            aria-hidden
                          />
                          <Label className="text-sm font-semibold">
                            {config.label}
                          </Label>
                        </div>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: categoryColor }}
                        >
                          {value.toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        value={[value]}
                        max={100}
                        min={0}
                        step={1}
                        onValueChange={([v]) => updateValue(category, v)}
                        aria-label={`${config.label} target percentage`}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step={1}
                          value={value}
                          onChange={(e) =>
                            updateValue(category, Number(e.target.value))
                          }
                          className="h-9 w-24"
                          aria-label={`${config.label} percentage input`}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  isValid
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20"
                    : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20"
                }`}
              >
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold">
                  {total.toFixed(0)}%
                </span>
              </div>

              {!isValid && (
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Percentages must total exactly 100% before saving.
                </p>
              )}

              <AnimatePresence>
                {showSuccess && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Settings saved successfully!
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto gap-2"
                  onClick={handleReset}
                  disabled={isResetting || isSaving}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4" />
                      Reset to 50/30/20
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto gap-2"
                  onClick={handleEvenlyDistribute}
                  disabled={total >= 100 || isDistributing || isSaving}
                >
                  {isDistributing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Distributing...
                    </>
                  ) : (
                    <>
                      <Equal className="h-4 w-4" />
                      Evenly Distribute Remaining
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto gap-2"
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : showSuccess ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
