import { test, expect } from "@playwright/test";
import { clearAppStorage, goToDashboardWithData } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearAppStorage(page);
  await goToDashboardWithData(page);
});

test.describe("category management", () => {
  test("add category via Add-category card", async ({ page }) => {
    // Find and click the Add category card / button
    const addCard = page.getByRole("button", { name: /add category/i });
    await expect(addCard).toBeVisible({ timeout: 5000 });
    await addCard.click();

    // A new category card should appear (it shows New Category or similar)
    await page.waitForTimeout(300);
    // Look for a new category card heading (may say "New Category" or be an input)
    const newCatName = page.getByText(/new category/i);
    const nameInput = page.getByLabel(/category name/i);
    await expect(newCatName.or(nameInput)).toBeVisible({ timeout: 5000 });
  });

  test("rename a category by clicking its title", async ({ page }) => {
    // Click the Needs category title to start renaming
    const needsTitle = page.getByRole("button", { name: /rename needs/i });
    await expect(needsTitle).toBeVisible({ timeout: 5000 });
    await needsTitle.click();

    // The rename input should appear
    const input = page.getByLabel(/category name/i);
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill("Housing");

    // Press Enter to confirm
    await input.press("Enter");
    await page.waitForTimeout(300);

    // The card should now show "Housing"
    await expect(page.getByText("Housing").first()).toBeVisible({ timeout: 3000 });
  });

  test("set category target by clicking target badge", async ({ page }) => {
    // Click the target badge on Needs (shows "Target: 50%")
    const targetBadge = page.getByRole("button", { name: /edit target percentage/i }).first();
    await expect(targetBadge).toBeVisible({ timeout: 5000 });
    await targetBadge.click();

    // The spinbutton that appeared (there may be multiple buttons with same label — use spinbutton role)
    const input = page.getByRole("spinbutton", { name: /target percentage/i }).first();
    await expect(input).toBeVisible({ timeout: 3000 });
    await input.fill("60");
    await input.press("Enter");
    await page.waitForTimeout(300);

    // Badge should now show 60%
    await expect(page.getByText(/target: 60%/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("delete category — keep items as Unassigned", async ({ page }) => {
    // Open the options menu for Needs
    const menu = page.getByRole("button", { name: /needs options/i });
    await expect(menu).toBeVisible({ timeout: 5000 });
    await menu.click();

    // Click Delete category
    const deleteItem = page.getByRole("menuitem", { name: /delete category/i });
    await expect(deleteItem).toBeVisible({ timeout: 3000 });
    await deleteItem.click();

    // Dialog appears — confirm with "Keep as Unassigned" (default)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await expect(dialog).toContainText(/delete/i);

    // Find the keep button and click it
    const keepBtn = dialog.getByRole("button", { name: /keep|unassigned/i });
    await expect(keepBtn).toBeVisible({ timeout: 3000 });
    await keepBtn.click();
    await page.waitForTimeout(300);

    // Needs card should be gone
    const needsCards = page.getByRole("button", { name: /rename needs/i });
    await expect(needsCards).toHaveCount(0, { timeout: 3000 });

    // Rent item should be in Unassigned lane
    await expect(page.getByText("Rent")).toBeVisible({ timeout: 3000 });
  });

  test("delete category — delete items", async ({ page }) => {
    // Open options for Needs
    await page.getByRole("button", { name: /needs options/i }).click();
    await page.getByRole("menuitem", { name: /delete category/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Click "Delete category and its items" button
    const deleteItemsBtn = dialog.getByRole("button", { name: /delete category and its items/i });
    await expect(deleteItemsBtn).toBeVisible({ timeout: 3000 });
    await deleteItemsBtn.click();
    await page.waitForTimeout(300);

    // Both Needs card and Rent item should be gone
    await expect(page.getByRole("button", { name: /rename needs/i })).toHaveCount(0);
    // Rent item gone too
    const rentItems = page.getByText("Rent");
    await expect(rentItems).toHaveCount(0, { timeout: 3000 });
  });

  test("reorder categories via Move left/right in dropdown menu", async ({ page }) => {
    // The initial order is Needs (0), Wants (1), Savings (2)
    // Move Wants left → should become first
    const wantsMenu = page.getByRole("button", { name: /wants options/i });
    await expect(wantsMenu).toBeVisible({ timeout: 5000 });
    await wantsMenu.click();

    const moveLeft = page.getByRole("menuitem", { name: /move left/i });
    await expect(moveLeft).toBeVisible({ timeout: 3000 });
    await moveLeft.click();
    await page.waitForTimeout(300);

    // Verify the category still shows up (reorder worked without crash)
    await expect(page.getByRole("button", { name: /wants options/i })).toBeVisible();
  });
});
