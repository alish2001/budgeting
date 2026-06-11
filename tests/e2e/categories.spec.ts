import { test, expect, type Page } from "@playwright/test";
import { clearAppStorage, goToDashboardWithData } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clearAppStorage(page);
  await goToDashboardWithData(page);
});

/** Add a subcategory through a category's kebab menu. */
async function addSubcategory(page: Page, parentName: string, name: string) {
  await page
    .getByRole("button", { name: new RegExp(`${parentName} options`, "i") })
    .first()
    .click();
  await page.getByRole("menuitem", { name: /add subcategory/i }).click();
  const input = page.getByLabel(/new subcategory name/i);
  await expect(input).toBeVisible({ timeout: 3000 });
  await input.fill(name);
  await input.press("Enter");
}

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

  test("delete a parent — promote subcategories up a level", async ({ page }) => {
    await addSubcategory(page, "needs", "Housing");
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: /needs options/i }).click();
    await page.getByRole("menuitem", { name: /delete category/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
    // Promote is the pre-selected default
    await expect(dialog.getByRole("radio", { name: /promote subcategories/i })).toBeVisible();
    await dialog.getByRole("button", { name: /keep|unassigned/i }).click();
    await page.waitForTimeout(300);

    // Needs is gone; Housing is promoted to a top-level grid card
    await expect(page.getByRole("button", { name: /rename needs/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /rename housing/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("button", { name: /collapse housing/i })).toHaveCount(0);
    // Needs' own item landed in Unassigned
    await expect(page.getByText("Rent")).toBeVisible();
  });

  test("delete a parent — delete the whole subtree", async ({ page }) => {
    await addSubcategory(page, "needs", "Housing");
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });

    await page.getByRole("button", { name: /needs options/i }).click();
    await page.getByRole("menuitem", { name: /delete category/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 3000 });
    await dialog.getByRole("radio", { name: /delete the whole subtree/i }).click();
    await dialog.getByRole("button", { name: /delete category and its items/i }).click();
    await page.waitForTimeout(300);

    // Needs, Housing, and the Rent item are all gone
    await expect(page.getByRole("button", { name: /rename needs/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /rename housing/i })).toHaveCount(0);
    await expect(page.getByText("Rent")).toHaveCount(0);
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

test.describe("subcategories", () => {
  test("add subcategory via card menu renders a card-within-card, not a new grid card", async ({ page }) => {
    await addSubcategory(page, "needs", "Housing");

    // The collapsible mini-card header is unique to subcategory cards
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });
    // And it is draggable like an item
    await expect(page.getByRole("button", { name: /drag housing subcategory/i })).toBeVisible();
  });

  test("dragging a subcategory card into another category re-parents its subtree", async ({ page }) => {
    await addSubcategory(page, "needs", "Housing");
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });

    // Give Housing an item so we can verify the subtree travels with it
    // (the first "+ Add Item" in DOM order is Housing's, inside the Needs card)
    await page.getByRole("button", { name: /^\+ add item$/i }).first().click();
    await page.getByLabel("Label").fill("Hydro");
    await page.getByLabel(/amount/i).fill("500");
    await page.getByRole("button", { name: /^add$/i }).click();
    await page.waitForTimeout(300);

    const handle = page.getByRole("button", { name: /drag housing subcategory/i });
    const handleBox = await handle.boundingBox();
    // The Wants card title sits inside the Wants drop zone
    const wantsTitle = page.getByRole("button", { name: /rename wants/i });
    const wantsBox = await wantsTitle.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(wantsBox).not.toBeNull();
    if (!handleBox || !wantsBox) return;

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      wantsBox.x + wantsBox.width / 2,
      wantsBox.y + wantsBox.height / 2,
      { steps: 10 },
    );
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Housing (and its Hydro item) now lives inside the Wants card
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Hydro").first()).toBeVisible();
    // Wants rolls up Housing's subtree: no direct items, $500 from subcategories
    await expect(page.getByText(/Direct: \$0\.00 · Subcategories: \$500\.00/)).toBeVisible();
    // Needs is back to its own $2,000 with no rollup line
    await expect(page.getByText("$2,000.00").first()).toBeVisible();
  });

  test("items in a subcategory roll up into the parent card total", async ({ page }) => {
    await addSubcategory(page, "needs", "Housing");
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });

    // Add an item inside the subcategory (its "+ Add Item" comes first in DOM
    // order, before the parent card's footer button)
    await page.getByRole("button", { name: /^\+ add item$/i }).first().click();
    await page.getByLabel("Label").fill("Hydro");
    await page.getByLabel(/amount/i).fill("500");
    await page.getByRole("button", { name: /^add$/i }).click();
    await page.waitForTimeout(300);

    // Needs header rolls up 2000 (Rent) + 500 (Hydro)
    await expect(page.getByText("$2,500.00").first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/Direct: \$2,000\.00/)).toBeVisible();
  });

  test("move a category under another via the command palette", async ({ page }) => {
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog");
    await expect(palette).toBeVisible({ timeout: 3000 });

    await palette.getByPlaceholder(/type a command/i).fill("move category");
    await palette.getByRole("option", { name: /move category/i }).click();

    // Pick Wants as the category to move
    await palette.getByRole("option", { name: /^wants$/i }).click();

    // Cycle-invalid destinations (Wants itself) are absent
    await expect(palette.getByRole("option", { name: /^wants$/i })).toHaveCount(0);

    // Move it under Needs
    await palette.getByRole("option", { name: /^needs$/i }).click();
    await page.waitForTimeout(300);

    // Wants now renders as a collapsible section inside the Needs card
    await expect(page.getByRole("button", { name: /collapse wants/i })).toBeVisible({ timeout: 3000 });
  });

  test("palette pick lists show hierarchical path labels", async ({ page }) => {
    await addSubcategory(page, "needs", "Housing");
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog");
    await expect(palette).toBeVisible({ timeout: 3000 });

    await palette.getByPlaceholder(/type a command/i).fill("rename category");
    await palette.getByRole("option", { name: /rename category/i }).click();

    await expect(palette.getByRole("option", { name: /needs › housing/i })).toBeVisible({ timeout: 3000 });

    // Searching by the parent's name matches the child row too
    await palette.getByPlaceholder(/choose a category to rename/i).fill("needs housing");
    await expect(palette.getByRole("option", { name: /needs › housing/i })).toBeVisible();
  });

  test("hierarchy survives a page reload", async ({ page }) => {
    await addSubcategory(page, "needs", "Housing");
    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 3000 });

    // Persistence is debounced; give it a moment before reloading
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: /collapse housing/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: /rename needs/i })).toBeVisible();
  });
});
