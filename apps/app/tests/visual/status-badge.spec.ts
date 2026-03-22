import { test, expect } from "@playwright/test";

test.describe("StatusBadge Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visual-test/status-badge");
    await page.waitForLoadState("networkidle");
  });

  test("renders all status variants correctly", async ({ page }) => {
    const section = page.locator('[data-testid="status-variants"]');
    await expect(section).toHaveScreenshot("status-badge-variants.png");
  });

  test("renders all status variants in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="status-variants"]');
    await expect(section).toHaveScreenshot("status-badge-variants-dark.png");
  });

  test("renders small size variants", async ({ page }) => {
    const section = page.locator('[data-testid="status-small"]');
    await expect(section).toHaveScreenshot("status-badge-small.png");
  });

  test("renders small size variants in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="status-small"]');
    await expect(section).toHaveScreenshot("status-badge-small-dark.png");
  });

  test("renders priority badges", async ({ page }) => {
    const section = page.locator('[data-testid="priority-variants"]');
    await expect(section).toHaveScreenshot("priority-badge-variants.png");
  });

  test("renders priority badges in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="priority-variants"]');
    await expect(section).toHaveScreenshot("priority-badge-variants-dark.png");
  });

  test("renders priority badges without dots", async ({ page }) => {
    const section = page.locator('[data-testid="priority-no-dot"]');
    await expect(section).toHaveScreenshot("priority-badge-no-dot.png");
  });

  test("renders online status indicators", async ({ page }) => {
    const section = page.locator('[data-testid="online-status"]');
    await expect(section).toHaveScreenshot("online-status.png");
  });

  test("renders online status in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="online-status"]');
    await expect(section).toHaveScreenshot("online-status-dark.png");
  });
});
