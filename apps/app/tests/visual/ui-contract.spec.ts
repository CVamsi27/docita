import { expect, test } from "@playwright/test";

test.describe("UI Contract Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visual-test/ui-contract");
    await page.waitForLoadState("networkidle");
  });

  test("renders scaffold and page header", async ({ page }) => {
    const section = page.locator('[data-testid="scaffold-and-header"]');
    await expect(section).toHaveScreenshot("ui-contract-scaffold-header.png");
  });

  test("renders scaffold and page header in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="scaffold-and-header"]');
    await expect(section).toHaveScreenshot(
      "ui-contract-scaffold-header-dark.png",
    );
  });

  test("renders loading and empty states", async ({ page }) => {
    const section = page.locator(
      '[data-testid="data-state-loading"], [data-testid="data-state-empty"]',
    );
    await expect(section).toHaveScreenshot("ui-contract-loading-empty.png");
  });

  test("renders loading and empty states in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator(
      '[data-testid="data-state-loading"], [data-testid="data-state-empty"]',
    );
    await expect(section).toHaveScreenshot(
      "ui-contract-loading-empty-dark.png",
    );
  });

  test("renders error and interactive states", async ({ page }) => {
    const section = page.locator(
      '[data-testid="data-state-error"], [data-testid="interactive-card"], [data-testid="error-inline"]',
    );
    await expect(section).toHaveScreenshot("ui-contract-error-interactive.png");
  });
});
