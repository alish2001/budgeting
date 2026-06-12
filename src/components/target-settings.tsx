"use client";

import { useEffect, useMemo, useRef, useState, useEffectEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useBudget } from "@/lib/budget-context";
import {
  getCategoriesInTreeOrder,
  getSubtreeCategoryIds,
  getTopLevelCategories,
} from "@/lib/budget-plan";
import { useDesignLanguage } from "@/lib/design-language-context";
import { resolveCategoryColor } from "@/lib/design-language";
import {
  ChevronDown,
  ChevronUp,
  Save,
  Equal,
  Check,
  Loader2,
  TriangleAlert,
} from "lucide-react";

export function TargetSettings() {
  const { state, setCategoryTargets } = useBudget();
  const { designLanguage } = useDesignLanguage();

  const categoryRows = useMemo(() => getCategoriesInTreeOrder(state), [state]);
  const categories = useMemo(
    () => categoryRows.map(({ category }) => category),
    [categoryRows],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Keep the draft in sync with the current categories (added / removed / changed).
  const signature = categories
    .map((c) => `${c.id}:${c.targetPercentage}`)
    .join("|");
  const prevSignatureRef = useRef<string>("");

  const syncDraft = useEffectEvent(() => {
    const next: Record<string, number> = {};
    for (const category of categories) next[category.id] = category.targetPercentage;
    setDraft(next);
    prevSignatureRef.current = signature;
  });

  useEffect(() => {
    if (prevSignatureRef.current !== signature) {
      syncDraft();
    }
  }, [signature]);

  const total = useMemo(
    () => categories.reduce((sum, c) => sum + (draft[c.id] ?? 0), 0),
    [categories, draft],
  );
  const isValid = Math.round(total) === 100;

  // Per-parent soft warning, evaluated against the draft values: the
  // children's (effective) targets exceed the parent's own explicit target.
  const overflowByCategoryId = useMemo(() => {
    const draftValue = (id: string) => draft[id] ?? 0;
    const effective = (id: string) =>
      getSubtreeCategoryIds(state.categories, id).reduce(
        (sum, subId) => sum + draftValue(subId),
        0,
      );
    const result: Record<string, number> = {};
    for (const category of categories) {
      const own = draftValue(category.id);
      const childTotal = effective(category.id) - own;
      if (own > 0 && childTotal > own) {
        result[category.id] = childTotal;
      }
    }
    return result;
  }, [categories, draft, state.categories]);

  const updateValue = (categoryId: string, value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setDraft((prev) => ({ ...prev, [categoryId]: clamped }));
  };

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    setTimeout(() => {
      setCategoryTargets(draft);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 300);
  };

  // Distribute across top-level categories and zero descendants, so the
  // top-level effective sum lands at exactly 100.
  const handleDistributeEvenly = () => {
    if (isDistributing || categories.length === 0) return;
    setIsDistributing(true);
    setTimeout(() => {
      const topLevel = getTopLevelCategories(state);
      const base = Math.floor(100 / topLevel.length);
      const remainder = 100 - base * topLevel.length;
      const next: Record<string, number> = {};
      for (const category of categories) next[category.id] = 0;
      topLevel.forEach((category, index) => {
        next[category.id] = base + (index < remainder ? 1 : 0);
      });
      setDraft(next);
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
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add a category to set targets.
                </p>
              ) : (
                <div className="space-y-4">
                  {categoryRows.map(({ category, depth }, index) => {
                    const color = resolveCategoryColor(
                      category.colorToken,
                      category.sortOrder,
                      designLanguage,
                    );
                    const value = draft[category.id] ?? category.targetPercentage;
                    const overflowChildTotal = overflowByCategoryId[category.id];
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: 0.05 * index }}
                        className="space-y-2 rounded-lg border border-border/60 p-3"
                        style={{ marginLeft: depth * 16 }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
                            <Label className="text-sm font-semibold truncate">{category.name}</Label>
                          </div>
                          <span className="text-sm font-semibold shrink-0" style={{ color }}>
                            {value.toFixed(0)}%
                          </span>
                        </div>
                        {overflowChildTotal !== undefined && (
                          <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                            Subcategory targets ({overflowChildTotal.toFixed(0)}%) exceed this
                            category&apos;s own target ({value.toFixed(0)}%)
                          </p>
                        )}
                        <Slider
                          value={[value]}
                          max={100}
                          min={0}
                          step={1}
                          onValueChange={([v]) => updateValue(category.id, v)}
                          aria-label={`${category.name} target percentage`}
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step={1}
                            value={value}
                            onChange={(e) => updateValue(category.id, Number(e.target.value))}
                            className="h-9 w-24"
                            aria-label={`${category.name} percentage input`}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  isValid
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20"
                    : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/20"
                }`}
              >
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-semibold">{total.toFixed(0)}%</span>
              </div>

              {!isValid && (
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Targets total {total.toFixed(0)}% — they don&apos;t add up to 100%. You can
                  still save, but the comparison will use these values.
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
                  variant="secondary"
                  className="w-full sm:w-auto gap-2"
                  onClick={handleDistributeEvenly}
                  disabled={isDistributing || isSaving || categories.length === 0}
                >
                  {isDistributing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Distributing...
                    </>
                  ) : (
                    <>
                      <Equal className="h-4 w-4" />
                      Distribute Evenly
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto gap-2"
                  onClick={handleSave}
                  disabled={isSaving || categories.length === 0}
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
