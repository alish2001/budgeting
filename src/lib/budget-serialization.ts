import pako from "pako";
import {
  BudgetState,
  SerializedBudget,
  CATEGORY_CONFIG,
  CategoryName,
} from "@/types/budget";

/**
 * Serialize budget state to a compact format for sharing
 * Strips IDs since they will be regenerated on import
 */
export function serializeBudget(state: BudgetState): SerializedBudget {
  const categories: CategoryName[] = ["needs", "wants", "savings", "income"];

  const items = categories.reduce(
    (acc, category) => {
      acc[category] = state.categories[category].items.map((item) => ({
        label: item.label,
        amount: item.amount,
      }));
      return acc;
    },
    {} as SerializedBudget["items"]
  );

  // Only include targets if they differ from defaults
  const defaultTargets = {
    needs: CATEGORY_CONFIG.needs.targetPercentage,
    wants: CATEGORY_CONFIG.wants.targetPercentage,
    savings: CATEGORY_CONFIG.savings.targetPercentage,
  };

  const hasCustomTargets =
    state.targetPercentages.needs !== defaultTargets.needs ||
    state.targetPercentages.wants !== defaultTargets.wants ||
    state.targetPercentages.savings !== defaultTargets.savings;

  const serialized: SerializedBudget = { items };

  if (hasCustomTargets) {
    serialized.targets = {
      needs: state.targetPercentages.needs,
      wants: state.targetPercentages.wants,
      savings: state.targetPercentages.savings,
    };
  }

  return serialized;
}

/**
 * Encode a budget state to a URL-safe string
 * Uses gzip compression + base64url encoding
 */
export function encodeBudget(state: BudgetState): string {
  const serialized = serializeBudget(state);
  const json = JSON.stringify(serialized);

  // Compress with pako
  const compressed = pako.deflate(json);

  // Convert to base64url (URL-safe base64)
  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // Remove padding

  return base64;
}

/**
 * Decode a shared budget code back to serialized format
 */
export function decodeBudget(code: string): SerializedBudget | null {
  try {
    // Convert from base64url back to base64
    let base64 = code.replace(/-/g, "+").replace(/_/g, "/");

    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    // Decode base64 to binary
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decompress
    const decompressed = pako.inflate(bytes, { to: "string" });

    // Parse JSON
    const parsed = JSON.parse(decompressed);

    // Validate structure
    if (!parsed.items || typeof parsed.items !== "object") {
      return null;
    }

    return parsed as SerializedBudget;
  } catch (error) {
    console.error("Failed to decode budget:", error);
    return null;
  }
}

/**
 * Generate a shareable URL with the budget encoded in query parameter
 */
export function generateShareUrl(state: BudgetState): string {
  const code = encodeBudget(state);
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://oversight.finance";

  return `${baseUrl}?budget=${code}`;
}

/**
 * Extract budget code from URL if present
 */
export function getBudgetCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  return params.get("budget");
}

/**
 * Clear the budget parameter from URL without reloading
 */
export function clearBudgetFromUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("budget");
  window.history.replaceState({}, "", url.toString());
}

/**
 * Get a preview of what a serialized budget contains
 */
export function getBudgetPreview(data: SerializedBudget): {
  totalIncome: number;
  totalNeeds: number;
  totalWants: number;
  totalSavings: number;
  itemCounts: { needs: number; wants: number; savings: number; income: number };
  hasCustomTargets: boolean;
  targets: { needs: number; wants: number; savings: number };
} {
  const sum = (items: { amount: number }[]) =>
    items.reduce((acc, item) => acc + item.amount, 0);

  return {
    totalIncome: sum(data.items.income),
    totalNeeds: sum(data.items.needs),
    totalWants: sum(data.items.wants),
    totalSavings: sum(data.items.savings),
    itemCounts: {
      needs: data.items.needs.length,
      wants: data.items.wants.length,
      savings: data.items.savings.length,
      income: data.items.income.length,
    },
    hasCustomTargets: !!data.targets,
    targets: data.targets || {
      needs: CATEGORY_CONFIG.needs.targetPercentage,
      wants: CATEGORY_CONFIG.wants.targetPercentage,
      savings: CATEGORY_CONFIG.savings.targetPercentage,
    },
  };
}
