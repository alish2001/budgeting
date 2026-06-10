import { test, expect } from "@playwright/test";
import path from "path";
import { clearAppStorage, goToDashboardWithData, seedV2Data } from "./helpers";

const SCREENSHOTS_DIR = path.join(__dirname, "__screenshots__");

test.describe("screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearAppStorage(page);
  });

  test("dashboard light mode — default design language", async ({ page }) => {
    await goToDashboardWithData(page);
    // Ensure light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "dashboard-light.png"),
      fullPage: false,
    });
  });

  test("dashboard dark mode — default design language", async ({ page }) => {
    await goToDashboardWithData(page);
    // Toggle to dark mode
    const toggle = page.getByRole("button", { name: /toggle theme|dark|light/i });
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(400);
    } else {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "dashboard-dark.png"),
      fullPage: false,
    });
  });

  test("dashboard Cyberpunk design language", async ({ page }) => {
    await goToDashboardWithData(page);
    // Switch to Cyberpunk via localStorage
    await page.evaluate(() => localStorage.setItem("design-language", "cyberpunk"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "dashboard-cyberpunk.png"),
      fullPage: false,
    });
  });

  test("dashboard Delight design language", async ({ page }) => {
    await goToDashboardWithData(page);
    await page.evaluate(() => localStorage.setItem("design-language", "delight"));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "dashboard-delight.png"),
      fullPage: false,
    });
  });

  test("delete-category dialog screenshot", async ({ page }) => {
    await goToDashboardWithData(page);

    // Open delete dialog for Needs
    await page.getByRole("button", { name: /needs options/i }).click();
    const deleteItem = page.getByRole("menuitem", { name: /delete category/i });
    await expect(deleteItem).toBeVisible({ timeout: 3000 });
    await deleteItem.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "delete-category-dialog.png"),
      fullPage: false,
    });
  });

  test("Unassigned lane visible during drag", async ({ page }) => {
    await goToDashboardWithData(page);

    const gripHandle = page.getByRole("button", { name: /drag rent/i });
    await expect(gripHandle).toBeVisible({ timeout: 5000 });
    const handleBox = await gripHandle.boundingBox();
    if (!handleBox) return;

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 10, startY + 1, { steps: 3 });
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "unassigned-lane-during-drag.png"),
      fullPage: false,
    });

    await page.mouse.up();
  });

  test("command palette open showing category options", async ({ page }) => {
    await goToDashboardWithData(page);

    // Open command palette
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(400);

    const cmdPalette = page.getByRole("dialog").filter({ hasText: /add|category|move|search/i });
    await expect(cmdPalette).toBeVisible({ timeout: 3000 });

    // Type "category" to filter to category commands
    await page.keyboard.type("category");
    await page.waitForTimeout(300);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "command-palette-category.png"),
      fullPage: false,
    });

    await page.keyboard.press("Escape");
  });
});
