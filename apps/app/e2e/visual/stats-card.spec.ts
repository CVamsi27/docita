import { test, expect } from "@playwright/test";

test.describe("StatsCard Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visual-test/stats-card");
    await page.waitForLoadState("networkidle");
  });

  test("renders gradient stat cards all variants", async ({ page }) => {
    const section = page.locator('[data-testid="gradient-cards"]');
    await expect(section).toHaveScreenshot("gradient-cards-variants.png");
  });

  test("renders gradient stat cards in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="gradient-cards"]');
    await expect(section).toHaveScreenshot("gradient-cards-variants-dark.png");
  });

  test("renders gradient cards with subtitle", async ({ page }) => {
    const section = page.locator('[data-testid="gradient-with-subtitle"]');
    await expect(section).toHaveScreenshot("gradient-cards-subtitle.png");
  });

  test("renders gradient cards with subtitle in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="gradient-with-subtitle"]');
    await expect(section).toHaveScreenshot(
      "gradient-cards-subtitle-dark.png",
    );
  });

  test("renders quick action cards", async ({ page }) => {
    const section = page.locator('[data-testid="quick-action-cards"]');
    await expect(section).toHaveScreenshot("quick-action-cards.png");
  });

  test("renders quick action cards in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="quick-action-cards"]');
    await expect(section).toHaveScreenshot("quick-action-cards-dark.png");
  });

  test("renders quick action cards with badges", async ({ page }) => {
    const section = page.locator('[data-testid="quick-action-with-badge"]');
    await expect(section).toHaveScreenshot("quick-action-cards-badge.png");
  });

  test("renders progress stats all variants", async ({ page }) => {
    const section = page.locator('[data-testid="progress-stats"]');
    await expect(section).toHaveScreenshot("progress-stats-variants.png");
  });

  test("renders progress stats in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="progress-stats"]');
    await expect(section).toHaveScreenshot("progress-stats-variants-dark.png");
  });

  test("renders progress stats with descriptions", async ({ page }) => {
    const section = page.locator('[data-testid="progress-with-description"]');
    await expect(section).toHaveScreenshot("progress-stats-description.png");
  });

  test("renders progress stats with descriptions in dark mode", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    const section = page.locator('[data-testid="progress-with-description"]');
    await expect(section).toHaveScreenshot(
      "progress-stats-description-dark.png",
    );
  });
});
