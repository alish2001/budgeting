"use client";

import { useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useBudget } from "@/lib/budget-context";
import { formatCurrency } from "@/lib/utils";
import { BudgetItem, SpendingCategoryName } from "@/types/budget";
import { useDesignLanguage } from "@/lib/design-language-context";
import { getCategoryColor, getItemizedCategoryPalette } from "@/lib/design-language";

type AssumptionMode = "monthly" | "yearly";
type BreakdownMode = "itemized" | "category";
type SeriesKind = "line" | "lineDashed" | "area";

interface ProjectionPoint {
  month: number;
  label: string;
  [key: string]: number | string;
}

interface SeriesConfig {
  dataKey: string;
  label: string;
  color: string;
  kind: SeriesKind;
  stackId?: string;
  fillOpacity?: number;
}

interface ItemSeriesMeta {
  key: string;
  label: string;
  monthlyAmount: number;
  color: string;
}

interface ProjectionTooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  color?: string;
  value?: number | string | Array<number | string>;
}

interface ProjectionTooltipProps {
  active?: boolean;
  payload?: readonly ProjectionTooltipEntry[];
  label?: string | number;
}

const HORIZON_PRESETS = [1, 3, 6, 12, 24];

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function createItemKey(category: SpendingCategoryName, item: BudgetItem, index: number): string {
  const safeLabel = item.label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .slice(0, 20);

  return `${category}-${index}-${safeLabel || "item"}`;
}

export function BudgetProjectionCard() {
  const { state, getTotalByCategory, getTotalIncome } = useBudget();
  const { designLanguage } = useDesignLanguage();

  const [isOpen, setIsOpen] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const [assumptionMode, setAssumptionMode] = useState<AssumptionMode>("monthly");
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>("itemized");
  const [showNetWorth, setShowNetWorth] = useState(true);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [annualInterestRate, setAnnualInterestRate] = useState(4);
  const [currentNetWorth, setCurrentNetWorth] = useState(0);

  const glowOpacity = useMotionValue(0);

  const tlTarget = useMotionValue(0.25);
  const trTarget = useMotionValue(0.25);
  const blTarget = useMotionValue(0.25);
  const brTarget = useMotionValue(0.25);

  const tlWeight = useSpring(tlTarget, { stiffness: 120, damping: 24, mass: 0.7 });
  const trWeight = useSpring(trTarget, { stiffness: 120, damping: 24, mass: 0.7 });
  const blWeight = useSpring(blTarget, { stiffness: 120, damping: 24, mass: 0.7 });
  const brWeight = useSpring(brTarget, { stiffness: 120, damping: 24, mass: 0.7 });

  const tlOpacity = useTransform(tlWeight, (w) => w * 0.42);
  const trOpacity = useTransform(trWeight, (w) => w * 0.42);
  const blOpacity = useTransform(blWeight, (w) => w * 0.42);
  const brOpacity = useTransform(brWeight, (w) => w * 0.42);

  const topLeftGlow = useMotionTemplate`radial-gradient(420px circle at 0% 0%, rgba(56,189,248,0.95) 0%, rgba(125,211,252,0.35) 22%, rgba(15,23,42,0) 68%)`;
  const topRightGlow = useMotionTemplate`radial-gradient(420px circle at 100% 0%, rgba(59,130,246,0.9) 0%, rgba(147,197,253,0.32) 24%, rgba(15,23,42,0) 68%)`;
  const bottomLeftGlow = useMotionTemplate`radial-gradient(420px circle at 0% 100%, rgba(34,197,94,0.9) 0%, rgba(134,239,172,0.3) 24%, rgba(15,23,42,0) 68%)`;
  const bottomRightGlow = useMotionTemplate`radial-gradient(420px circle at 100% 100%, rgba(14,165,233,0.9) 0%, rgba(186,230,253,0.3) 24%, rgba(15,23,42,0) 68%)`;

  const totalIncome = getTotalIncome();
  const totalNeeds = getTotalByCategory("needs");
  const totalWants = getTotalByCategory("wants");
  const totalSavings = getTotalByCategory("savings");

  const monthlyFactor = assumptionMode === "monthly" ? 1 : 1 / 12;
  const monthlyIncome = totalIncome * monthlyFactor;
  const monthlyNeeds = totalNeeds * monthlyFactor;
  const monthlyWants = totalWants * monthlyFactor;
  const monthlySavings = totalSavings * monthlyFactor;

  const itemSeries = useMemo<ItemSeriesMeta[]>(() => {
    const categories: SpendingCategoryName[] = ["needs", "wants", "savings"];

    return categories.flatMap((category) => {
      const palette = getItemizedCategoryPalette(category, designLanguage);

      return state.categories[category].items.map((item, index) => ({
        key: createItemKey(category, item, index),
        label: item.label,
        monthlyAmount: item.amount * monthlyFactor,
        color: palette[index % palette.length],
      }));
    });
  }, [designLanguage, monthlyFactor, state.categories]);

  const rawProjection = useMemo<ProjectionPoint[]>(() => {
    const points: ProjectionPoint[] = [];
    const monthlyRate = annualInterestRate / 100 / 12;

    let savingsContribution = 0;
    let savingsWithInterest = 0;

    for (let month = 1; month <= projectionMonths; month += 1) {
      const netCashflowPerPeriod = monthlyIncome - monthlyNeeds - monthlyWants - monthlySavings;
      const netCashflowCumulative = netCashflowPerPeriod * month;
      const row: ProjectionPoint = {
        month,
        label: `M${month}`,
        needs: roundCurrency(monthlyNeeds * month),
        wants: roundCurrency(monthlyWants * month),
        savingsContribution: roundCurrency(monthlySavings * month),
        netCashflowPerPeriod: roundCurrency(netCashflowPerPeriod),
        netCashflowCumulative: roundCurrency(netCashflowCumulative),
      };

      for (const item of itemSeries) {
        row[item.key] = roundCurrency(item.monthlyAmount * month);
      }

      savingsContribution += monthlySavings;
      savingsWithInterest = savingsWithInterest * (1 + monthlyRate) + monthlySavings;
      row.savingsWithInterest = roundCurrency(savingsWithInterest);
      row.savingsContribution = roundCurrency(savingsContribution);
      row.netWorthProjection = roundCurrency(
        currentNetWorth + savingsWithInterest + netCashflowCumulative,
      );

      points.push(row);
    }

    return points;
  }, [
    annualInterestRate,
    itemSeries,
    monthlyIncome,
    monthlyNeeds,
    monthlySavings,
    monthlyWants,
    projectionMonths,
    currentNetWorth,
  ]);

  const useYearAxis = projectionMonths > 12;

  const chartData = useMemo(() => {
    if (!useYearAxis) return rawProjection;
    const yearlyPoints: ProjectionPoint[] = [];

    rawProjection.forEach((point) => {
      if (point.month % 12 === 0 || point.month === projectionMonths) {
        yearlyPoints.push({
          ...point,
          label: `Y${Math.ceil(point.month / 12)}`,
        });
      }
    });

    return yearlyPoints;
  }, [projectionMonths, rawProjection, useYearAxis]);

  const projectionEnd = rawProjection[rawProjection.length - 1];

  const series = useMemo<SeriesConfig[]>(() => {
    if (breakdownMode === "category") {
      const categories = [
        {
          dataKey: "needs",
          label: "Needs",
          color: getCategoryColor("needs", designLanguage),
          kind: "area",
          amount: Math.abs(monthlyNeeds),
        },
        {
          dataKey: "wants",
          label: "Wants",
          color: getCategoryColor("wants", designLanguage),
          kind: "area",
          amount: Math.abs(monthlyWants),
        },
      ];

      return [
        ...categories
          .sort((a, b) => b.amount - a.amount)
          .map(({ amount: _amount, ...entry }) => entry),
        {
          dataKey: "savingsWithInterest",
          label: "Savings (With Interest)",
          color: getCategoryColor("savings", designLanguage),
          kind: "line",
        },
      ];
    }

    // Draw larger fills first (behind), smaller fills last (front).
    const itemized = [...itemSeries]
      .sort((a, b) => Math.abs(b.monthlyAmount) - Math.abs(a.monthlyAmount))
      .map<SeriesConfig>((item) => ({
        dataKey: item.key,
        label: item.label,
        color: item.color,
        kind: "area",
        fillOpacity: 0.18,
      }));

    itemized.push({
      dataKey: "savingsWithInterest",
      label: "Savings (With Interest)",
      color: getCategoryColor("savings", designLanguage),
      kind: "line",
    });
    return itemized;
  }, [breakdownMode, designLanguage, itemSeries, monthlyNeeds, monthlyWants]);

  const seriesWithNetWorth = useMemo<SeriesConfig[]>(() => {
    if (!showNetWorth) return series;
    return [
      ...series,
      {
        dataKey: "netWorthProjection",
        label: "Projected Net Worth",
        color: "#64748b",
        kind: "line",
      },
    ];
  }, [series, showNetWorth]);

  const seriesLabelLookup = useMemo(() => {
    const entries = seriesWithNetWorth.map((entry) => [entry.dataKey, entry.label]);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [seriesWithNetWorth]);

  const projectionNetCashflow = Number(projectionEnd?.netCashflowPerPeriod || 0);
  const projectionNetWorth = Number(projectionEnd?.netWorthProjection || 0);
  const projectionNetCashflowByEnd = Number(projectionEnd?.netCashflowCumulative || 0);

  const formatProjectionTooltipLabel = (label: string | number | undefined) => {
    const value = String(label ?? "");
    return !useYearAxis
      ? `Month ${value.replace("M", "")}`
      : `Year ${value.replace("Y", "")}`;
  };

  const renderProjectionTooltip = ({ active, payload, label }: ProjectionTooltipProps) => {
    if (!active || !payload?.length) return null;

    const rows = payload
      .map((entry) => {
        const rawValue = entry.value;
        const numericValue =
          typeof rawValue === "number"
            ? rawValue
            : Array.isArray(rawValue)
              ? Number(rawValue[0] || 0)
              : Number(rawValue || 0);

        const key =
          typeof entry.dataKey === "string"
            ? entry.dataKey
            : typeof entry.name === "string"
              ? entry.name
              : "";

        return {
          key,
          label: seriesLabelLookup[key] || key,
          value: numericValue,
          color: entry.color || "var(--muted-foreground)",
        };
      })
      .filter((row) => row.label);

    if (!rows.length) return null;

    const netWorthRows = rows.filter((row) => row.key === "netWorthProjection");
    const sortedRows = rows
      .filter((row) => row.key !== "netWorthProjection")
      .sort((a, b) => b.value - a.value);

    return (
      <div className="min-w-56 max-w-[22rem] rounded-xl border border-border/80 bg-card/95 px-3 py-2.5 shadow-xl shadow-black/10 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {formatProjectionTooltipLabel(label)}
        </p>
        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {[...sortedRows, ...netWorthRows].map((row) => {
            const isNetWorth = row.label.startsWith("Projected Net Worth");
            return (
              <div
                key={row.key}
                className={`flex items-center gap-2 text-sm ${
                  isNetWorth ? "mt-2 border-t border-border/70 pt-2" : ""
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-foreground/85">
                  {row.label}
                </span>
                <span
                  className={`ml-auto shrink-0 font-medium tabular-nums ${
                    isNetWorth ? "text-foreground" : "text-foreground/85"
                  }`}
                >
                  {formatCurrency(row.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const setInvertedCornerTargets = (x: number, y: number) => {
    const closeTL = (1 - x) * (1 - y);
    const closeTR = x * (1 - y);
    const closeBL = (1 - x) * y;
    const closeBR = x * y;

    // Inverted response: farther from a corner => brighter that corner.
    // Normalize by 3 so total influence stays subtle and stable.
    tlTarget.set((1 - closeTL) / 3);
    trTarget.set((1 - closeTR) / 3);
    blTarget.set((1 - closeBL) / 3);
    brTarget.set((1 - closeBR) / 3);
  };

  return (
    <Card
      className="group relative overflow-hidden border border-border/80 bg-card transition-all duration-200 hover:border-sky-500/30 hover:shadow-xl hover:shadow-sky-500/10"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const nextX = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width),
        );
        const nextY = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height),
        );
        setInvertedCornerTargets(nextX, nextY);
      }}
      onPointerEnter={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const nextX = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width),
        );
        const nextY = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height),
        );
        setInvertedCornerTargets(nextX, nextY);
        glowOpacity.set(1);
      }}
      onPointerLeave={() => glowOpacity.set(0)}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ opacity: glowOpacity }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: topLeftGlow, opacity: tlOpacity }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: topRightGlow, opacity: trOpacity }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: bottomLeftGlow, opacity: blOpacity }}
        />
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: bottomRightGlow, opacity: brOpacity }}
        />
      </motion.div>
      <CardHeader
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls="projection-card-content"
        className="flex flex-row items-center justify-between py-3 cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-lg"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <CardTitle className="text-base sm:text-lg font-semibold">
          Future Projections
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
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
            key="projection-content"
            id="projection-card-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="relative z-10 space-y-5 pt-2 pb-5">
              {totalIncome === 0 ? (
                <p className="text-muted-foreground text-center py-10">
                  Add income and budget items to view future projections
                </p>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Forecast cumulative spending and savings growth over time.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Savings growth uses {annualInterestRate.toFixed(1)}% APR, compounded monthly.
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm">Projection Horizon</Label>
                      <span className="text-xs text-muted-foreground">
                        {projectionMonths > 12
                          ? `${projectionMonths} months • ${Math.ceil(
                              projectionMonths / 12,
                            )} years on axis`
                          : `${projectionMonths} months • monthly axis`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {HORIZON_PRESETS.map((months) => {
                        const isSelected = projectionMonths === months;
                        return (
                          <button
                            key={months}
                            type="button"
                            onClick={() => setProjectionMonths(months)}
                            className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                              isSelected
                                ? "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                                : "border-border bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {months >= 12 ? `${months / 12}Y` : `${months}M`}
                          </button>
                        );
                      })}
                    </div>
                    <Slider
                      value={[projectionMonths]}
                      min={1}
                      max={24}
                      step={1}
                      onValueChange={([value]) => setProjectionMonths(value)}
                      aria-label="Projection horizon in months"
                    />
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-72"
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      minHeight={260}
                    >
                      <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          width={80}
                          tickFormatter={(value: number) => formatCurrency(value)}
                        />
                        <Tooltip
                          content={renderProjectionTooltip}
                          cursor={{
                            stroke: "var(--border)",
                            strokeWidth: 1.25,
                            strokeDasharray: "4 4",
                          }}
                        />

                        {seriesWithNetWorth.map((entry) => {
                          const isDimmed =
                            hoveredSeries !== null && hoveredSeries !== entry.dataKey;
                          const opacity = isDimmed ? 0.2 : 1;
                          const strokeWidth =
                            entry.dataKey === "savingsWithInterest" ? 3 : isDimmed ? 1.5 : 2.5;

                          if (entry.kind === "area") {
                            return (
                              <Area
                                key={entry.dataKey}
                                type="monotone"
                                dataKey={entry.dataKey}
                                stackId={entry.stackId}
                                stroke={entry.color}
                                fill={entry.color}
                                strokeWidth={strokeWidth}
                                strokeOpacity={opacity}
                                fillOpacity={(entry.fillOpacity ?? 0.12) * opacity}
                                isAnimationActive
                                animationDuration={350}
                              />
                            );
                          }

                          if (entry.kind === "lineDashed") {
                            return (
                              <Line
                                key={entry.dataKey}
                                type="monotone"
                                dataKey={entry.dataKey}
                                stroke={entry.color}
                                strokeDasharray="5 4"
                                strokeWidth={strokeWidth}
                                strokeOpacity={opacity}
                                dot={false}
                                isAnimationActive
                                animationDuration={350}
                              />
                            );
                          }

                          return (
                            <Line
                              key={entry.dataKey}
                              type="monotone"
                              dataKey={entry.dataKey}
                              stroke={entry.color}
                              strokeWidth={strokeWidth}
                              strokeOpacity={opacity}
                              dot={false}
                              isAnimationActive
                              animationDuration={350}
                            />
                          );
                        })}
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <div className="rounded-lg border border-border/70 p-3">
                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between text-sm font-medium"
                    >
                      <span>Advanced Assumptions</span>
                      {isAdvancedOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isAdvancedOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 space-y-3">
                            <div className="space-y-2">
                              <Label>Breakdown</Label>
                              <div
                                className="relative inline-flex rounded-lg border border-border bg-muted/40 p-1"
                                role="tablist"
                                aria-label="Projection breakdown mode"
                              >
                                {["itemized", "category"].map((mode) => {
                                  const isActive = breakdownMode === mode;
                                  const label =
                                    mode === "itemized" ? "Every Entry" : "By Category";

                                  return (
                                    <button
                                      key={mode}
                                      role="tab"
                                      aria-selected={isActive}
                                      onClick={() => setBreakdownMode(mode as BreakdownMode)}
                                      className="relative z-10 min-w-28 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                                    >
                                      {isActive && (
                                        <motion.span
                                          layoutId="projection-breakdown-pill"
                                          className="absolute inset-0 rounded-md bg-background shadow-sm"
                                          transition={{ duration: 0.15 }}
                                        />
                                      )}
                                      <span
                                        className={`relative ${
                                          isActive
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="assumption-mode">
                                  Assume budget entries are
                                </Label>
                                <select
                                  id="assumption-mode"
                                  value={assumptionMode}
                                  onChange={(event) =>
                                    setAssumptionMode(
                                      event.target.value as AssumptionMode,
                                    )
                                  }
                                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                                >
                                  <option value="monthly">Monthly</option>
                                  <option value="yearly">Yearly</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="interest-rate">
                                  Savings interest APR (%)
                                </Label>
                                <Input
                                  id="interest-rate"
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step={0.1}
                                  value={annualInterestRate}
                                  onChange={(event) =>
                                    setAnnualInterestRate(
                                      Math.max(0, Number(event.target.value) || 0),
                                    )
                                  }
                                  className="h-9 text-base sm:text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="current-net-worth">
                                  Current net worth
                                </Label>
                                <Input
                                  id="current-net-worth"
                                  name="currentNetWorth"
                                  type="number"
                                  inputMode="decimal"
                                  step={100}
                                  value={currentNetWorth}
                                  onChange={(event) =>
                                    setCurrentNetWorth(Number(event.target.value) || 0)
                                  }
                                  className="h-9 text-base sm:text-sm"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Projected net worth includes your current net worth, cumulative net
                              cashflow, and savings with interest.
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <input
                                id="show-net-worth"
                                name="showNetWorth"
                                type="checkbox"
                                checked={showNetWorth}
                                onChange={(event) => setShowNetWorth(event.target.checked)}
                                className="h-4 w-4 rounded border border-input text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              />
                              <Label htmlFor="show-net-worth" className="text-sm">
                                Show projected net worth on chart
                              </Label>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="rounded-lg border border-border/70 p-3">
                    <p className="text-xs text-muted-foreground mb-2">Visible Series</p>
                    <div className="flex flex-wrap gap-2">
                      {seriesWithNetWorth.map((entry) => (
                        <div
                          key={entry.dataKey}
                          className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-all duration-150 ${
                            hoveredSeries === entry.dataKey
                              ? "border-sky-500/60 bg-sky-500/10"
                              : hoveredSeries
                              ? "opacity-40 border-border"
                              : "border-border"
                          }`}
                          onMouseEnter={() => setHoveredSeries(entry.dataKey)}
                          onMouseLeave={() => setHoveredSeries(null)}
                          onFocus={() => setHoveredSeries(entry.dataKey)}
                          onBlur={() => setHoveredSeries(null)}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: entry.color }}
                            aria-hidden="true"
                          />
                          <span className="max-w-44 truncate">{entry.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {projectionEnd && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="text-muted-foreground">Needs by end</p>
                        <p
                          className="font-semibold"
                          style={{ color: getCategoryColor("needs", designLanguage) }}
                        >
                          {formatCurrency(Number(projectionEnd.needs || 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="text-muted-foreground">Wants by end</p>
                        <p
                          className="font-semibold"
                          style={{ color: getCategoryColor("wants", designLanguage) }}
                        >
                          {formatCurrency(Number(projectionEnd.wants || 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="text-muted-foreground">Savings by end</p>
                        <p
                          className="font-semibold"
                          style={{ color: getCategoryColor("savings", designLanguage) }}
                        >
                          {formatCurrency(Number(projectionEnd.savingsWithInterest || 0))}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="text-muted-foreground">Interest earned</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(
                            Math.max(
                              0,
                              Number(projectionEnd.savingsWithInterest || 0) -
                                Number(projectionEnd.savingsContribution || 0),
                            ),
                          )}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="text-muted-foreground">Net Cashflow / Period</p>
                        <p
                          className={`font-semibold ${
                            projectionNetCashflow >= 0
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-destructive"
                          }`}
                        >
                          {formatCurrency(projectionNetCashflow)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="text-muted-foreground">Net Cashflow by end</p>
                        <p
                          className={`font-semibold ${
                            projectionNetCashflowByEnd >= 0
                              ? "text-sky-600 dark:text-sky-400"
                              : "text-destructive"
                          }`}
                        >
                          {formatCurrency(projectionNetCashflowByEnd)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/70 p-3">
                        <p className="text-muted-foreground">Projected Net Worth</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatCurrency(projectionNetWorth)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
