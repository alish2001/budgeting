import pako from "pako";
import {
  BudgetPlan,
  SerializedBudget,
  SerializedBudgetV3,
  SerializedBudgetV4,
} from "@/types/budget";
import {
  serializePlan,
  serializedV2ToV3,
  serializedV3ToV4,
  getSerializedPreview,
  type BudgetPreview,
} from "@/lib/budget-plan";

/**
 * Serialize a plan to the compact v4 share format.
 * IDs are stripped since they are regenerated on import.
 */
export function serializeBudget(plan: BudgetPlan): SerializedBudgetV4 {
  return serializePlan(plan);
}

/**
 * Encode a plan to a URL-safe string (gzip + base64url).
 */
export function encodeBudget(plan: BudgetPlan): string {
  const serialized = serializeBudget(plan);
  const json = JSON.stringify(serialized);

  const compressed = pako.deflate(json);

  const base64 = btoa(String.fromCharCode(...compressed))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return base64;
}

function looksLikeV2(value: unknown): value is SerializedBudget {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    typeof (value as { items: unknown }).items === "object"
  );
}

/**
 * Decode a shared budget code into the v4 serialized format.
 * Accepts legacy v2 and v3 payloads as well as v4 payloads.
 */
export function decodeBudget(code: string): SerializedBudgetV4 | null {
  try {
    let base64 = code.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decompressed = pako.inflate(bytes, { to: "string" });
    const parsed = JSON.parse(decompressed);

    if (parsed && parsed.version === 4 && Array.isArray(parsed.categories)) {
      return parsed as SerializedBudgetV4;
    }

    if (parsed && parsed.version === 3 && Array.isArray(parsed.categories)) {
      return serializedV3ToV4(parsed as SerializedBudgetV3);
    }

    if (looksLikeV2(parsed)) {
      return serializedV3ToV4(serializedV2ToV3(parsed as SerializedBudget));
    }

    return null;
  } catch (error) {
    console.error("Failed to decode budget:", error);
    return null;
  }
}

/**
 * Generate a shareable URL with the budget encoded in a query parameter.
 */
export function generateShareUrl(plan: BudgetPlan): string {
  const code = encodeBudget(plan);
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : "https://oversight.finance";

  return `${baseUrl}?budget=${code}`;
}

export function getBudgetCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("budget");
}

export function clearBudgetFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("budget");
  window.history.replaceState({}, "", url.toString());
}

export function getBudgetPreview(data: SerializedBudgetV4): BudgetPreview {
  return getSerializedPreview(data);
}
