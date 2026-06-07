import { test, expect } from "@playwright/test";
import { clearAppStorage, goToDashboardWithData } from "./helpers";
import pako from "pako";

// Build a v2-style share code in Node (pako runs fine in the test process)
function buildV2ShareCode(payload: object): string {
  const json = JSON.stringify(payload);
  const compressed = pako.deflate(json);
  return Buffer.from(compressed)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearAppStorage(page);
});

test.describe("share / import", () => {
  test("share dialog opens and shows a budget code", async ({ page }) => {
    await goToDashboardWithData(page);

    const shareBtn = page.getByRole("button", { name: /share/i });
    await expect(shareBtn).toBeVisible({ timeout: 5000 });
    await shareBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // The "Budget code" input (aria-label="Budget code")
    const codeInput = dialog.getByLabel("Budget code");
    await expect(codeInput).toBeVisible({ timeout: 3000 });

    const code = await codeInput.inputValue();
    expect(code.length).toBeGreaterThan(10);

    await page.keyboard.press("Escape");
  });

  test("import a v2 legacy share code", async ({ page }) => {
    await goToDashboardWithData(page);

    const v2Payload = {
      items: {
        income: [{ label: "Job", amount: 3000 }],
        needs: [{ label: "Mortgage", amount: 1000 }],
        wants: [],
        savings: [],
      },
    };
    const v2Code = buildV2ShareCode(v2Payload);

    // Open import dialog
    const importBtn = page.getByRole("button", { name: /import/i });
    await expect(importBtn).toBeVisible({ timeout: 5000 });
    await importBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Fill the "Budget Code" input (label "Budget Code")
    const codeInput = dialog.getByLabel("Budget Code");
    await expect(codeInput).toBeVisible({ timeout: 3000 });
    await codeInput.fill(v2Code);
    await page.waitForTimeout(300);

    // Preview should appear showing the decoded budget
    await expect(dialog).toContainText("Budget Preview", { timeout: 3000 });
    await expect(dialog).toContainText("Needs");

    // Import
    const importConfirm = dialog.getByRole("button", { name: /import budget/i });
    await expect(importConfirm).toBeVisible({ timeout: 3000 });
    await importConfirm.click();
    await page.waitForTimeout(1800); // wait for success + close animation

    // Dashboard should now show the imported plan with Needs/Wants/Savings
    await expect(page.getByText("Needs").first()).toBeVisible({ timeout: 5000 });
  });

  test("round-trip v3 share code via URL", async ({ page }) => {
    await goToDashboardWithData(page);

    // Get the share code from the dialog
    const shareBtn = page.getByRole("button", { name: /share/i });
    await shareBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // "Budget code" input has aria-label="Budget code"
    const codeInput = dialog.getByLabel("Budget code");
    await expect(codeInput).toBeVisible({ timeout: 3000 });
    const shareCode = await codeInput.inputValue();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    if (!shareCode || shareCode.length < 5) { test.skip(); return; }

    // Clear storage and navigate with the code as a URL param
    await clearAppStorage(page);
    await page.goto(`/?budget=${shareCode}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // The ImportBudgetDialog auto-opens when a ?budget= param is present
    const importDialog = page.getByRole("dialog");
    await expect(importDialog).toBeVisible({ timeout: 5000 });

    // Preview should decode successfully and show the budget
    await expect(importDialog).toContainText("Budget Preview", { timeout: 3000 });

    // Import the budget
    const importConfirm = importDialog.getByRole("button", { name: /import budget/i });
    await expect(importConfirm).toBeEnabled({ timeout: 3000 });
    await importConfirm.click();
    await page.waitForTimeout(1800); // success animation + close

    // After import the URL param is cleared; page shows the imported plan
    await expect(page).toHaveURL("/", { timeout: 5000 });
    await expect(page.getByText("Needs").first()).toBeVisible({ timeout: 5000 });
  });
});
