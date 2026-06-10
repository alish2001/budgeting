import { test, expect } from "@playwright/test";
import { clearAppStorage, goToDashboardWithData } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearAppStorage(page);
  await goToDashboardWithData(page);
  // Disable CSS animations to prevent framer-motion delays in tests
  await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
});

/** Locates a category card by its title (data-slot="card-title"). */
function getCategoryCardByName(page: import("@playwright/test").Page, name: string) {
  return page
    .locator('[data-slot="card"]')
    .filter({ has: page.locator('[data-slot="card-title"]').filter({ hasText: name }) });
}

test.describe("budget items", () => {
  test("add a budget item to a category", async ({ page }) => {
    const needsCard = getCategoryCardByName(page, "Needs");
    await expect(needsCard).toBeVisible({ timeout: 5000 });

    await needsCard.getByRole("button", { name: /\+ add item/i }).click();

    // BudgetInput form has Label and Amount ($) labels
    const labelInput = page.getByLabel("Label").first();
    await expect(labelInput).toBeVisible({ timeout: 3000 });
    await labelInput.fill("Groceries");
    await page.getByLabel("Amount ($)").first().fill("300");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    await expect(needsCard.getByText("Groceries")).toBeVisible({ timeout: 3000 });
  });

  test("edit a budget item", async ({ page }) => {
    const editBtn = page.getByRole("button", { name: /edit rent/i });
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    const labelInput = page.getByLabel("Label").first();
    await expect(labelInput).toBeVisible({ timeout: 3000 });
    await labelInput.clear();
    await labelInput.fill("Rent Updated");
    await page.getByRole("button", { name: /save/i }).first().click();
    await page.waitForTimeout(200);

    await expect(page.getByText("Rent Updated").first()).toBeVisible({ timeout: 3000 });
  });

  test("remove a budget item", async ({ page }) => {
    const removeBtn = page.getByRole("button", { name: /remove rent/i });
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click();
    await page.waitForTimeout(200);

    await expect(page.getByText("Rent")).toHaveCount(0, { timeout: 3000 });
  });

  test("move budget item via ⋯ menu to another category", async ({ page }) => {
    // The move button aria-label is "Move Rent" — use exact match to avoid
    // partial match with "Remove Rent"
    const moveBtn = page.getByRole("button", { name: "Move Rent", exact: true });
    await expect(moveBtn).toBeVisible({ timeout: 5000 });
    await moveBtn.click();

    const moveToTrigger = page.getByRole("menuitem", { name: /move to/i });
    await expect(moveToTrigger).toBeVisible({ timeout: 3000 });
    await moveToTrigger.click();

    const wantsOption = page.getByRole("menuitem", { name: "Wants" });
    await expect(wantsOption).toBeVisible({ timeout: 3000 });
    await wantsOption.click();
    await page.waitForTimeout(300);

    const wantsCard = getCategoryCardByName(page, "Wants");
    await expect(wantsCard).toContainText("Rent", { timeout: 3000 });

    const needsCard = getCategoryCardByName(page, "Needs");
    await expect(needsCard).not.toContainText("Rent", { timeout: 2000 });
  });

  test("drag a budget item to another category using mouse", async ({ page }) => {
    const gripHandle = page.getByRole("button", { name: /drag rent/i });
    await expect(gripHandle).toBeVisible({ timeout: 5000 });

    // Scroll the handle into view and get its bounds
    await gripHandle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    const wantsCard = getCategoryCardByName(page, "Wants");
    await expect(wantsCard).toBeVisible({ timeout: 5000 });

    const handleBox = await gripHandle.boundingBox();
    const wantsBox = await wantsCard.boundingBox();
    if (!handleBox || !wantsBox) { test.skip(); return; }

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = wantsBox.x + wantsBox.width / 2;
    const endY = wantsBox.y + wantsBox.height / 2;

    // Perform drag-and-drop via pointer events:
    // dnd-kit PointerSensor activates after 5px movement
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move past the 5px threshold
    await page.mouse.move(startX + 10, startY, { steps: 5 });
    await page.waitForTimeout(100);
    // Move to the Wants card center in multiple steps
    await page.mouse.move(endX, endY, { steps: 20 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(400);

    await expect(wantsCard).toContainText("Rent", { timeout: 4000 });
  });

  test("drag an item to the Unassigned lane via mouse", async ({ page }) => {
    const gripHandle = page.getByRole("button", { name: /drag rent/i });
    await expect(gripHandle).toBeVisible({ timeout: 5000 });
    await gripHandle.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);

    const handleBox = await gripHandle.boundingBox();
    if (!handleBox) { test.skip(); return; }

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Start the drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move past the 5px activation threshold (horizontally to not trigger scroll)
    await page.mouse.move(startX + 10, startY, { steps: 5 });
    await page.waitForTimeout(300);

    // Unassigned card should now be visible (appears when activeItem !== null)
    const unassignedCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.locator('[data-slot="card-title"]').filter({ hasText: "Unassigned" }) });
    await expect(unassignedCard).toBeVisible({ timeout: 4000 });

    const unassignedBox = await unassignedCard.boundingBox();
    if (!unassignedBox) {
      await page.mouse.up();
      test.skip();
      return;
    }

    await page.mouse.move(
      unassignedBox.x + unassignedBox.width / 2,
      unassignedBox.y + unassignedBox.height / 2,
      { steps: 20 }
    );
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(400);

    await expect(unassignedCard).toContainText("Rent", { timeout: 4000 });
  });
});
