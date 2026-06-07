import { test, expect } from "@playwright/test";
import { clearAppStorage } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearAppStorage(page);
});

test.describe("fresh user / onboarding", () => {
  test("fresh user redirects to /onboarding", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/onboarding", { timeout: 5000 });
  });

  test("complete onboarding flow and land on dashboard with Needs/Wants/Savings", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    // Welcome step
    const beginBtn = page.getByRole("button", { name: /begin setup/i });
    await expect(beginBtn).toBeVisible({ timeout: 5000 });
    await beginBtn.click();

    // Income step - add income item
    await page.waitForTimeout(300);
    const labelInput = page.getByRole("textbox").first();
    await expect(labelInput).toBeVisible({ timeout: 3000 });
    await labelInput.fill("Salary");
    const amountInput = page.getByRole("spinbutton").first();
    await amountInput.fill("5000");
    await amountInput.press("Enter");
    await page.waitForTimeout(300);
    // Proceed to next step
    await page.getByRole("button", { name: /continue/i }).click();

    // Needs step - skip
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /skip for now/i }).click();

    // Wants step - skip
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /skip for now/i }).click();

    // Savings step - skip
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /skip for now/i }).click();

    // Review step - apply
    await page.waitForTimeout(300);
    const applyBtn = page.getByRole("button", { name: /apply to dashboard/i });
    await expect(applyBtn).toBeVisible({ timeout: 5000 });
    await applyBtn.click();

    // Should land on dashboard
    await expect(page).toHaveURL("/", { timeout: 8000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Default categories visible
    await expect(page.getByText("Needs").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Wants").first()).toBeVisible();
    await expect(page.getByText("Savings").first()).toBeVisible();
  });

  test("skip onboarding lands on dashboard", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForLoadState("networkidle");

    const skipLink = page.getByRole("link", { name: /skip and use dashboard/i });
    await expect(skipLink).toBeVisible({ timeout: 5000 });
    await skipLink.click();

    await expect(page).toHaveURL("/", { timeout: 5000 });
  });
});
