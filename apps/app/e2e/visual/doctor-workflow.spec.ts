import { expect, test } from "@playwright/test";

test.describe("Doctor Workflow Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/visual-test/doctor-workflow");
    await page.waitForLoadState("networkidle");
  });

  test("renders dashboard and appointments sections (desktop)", async ({
    page,
  }) => {
    const section = page.locator(
      '[data-testid="doctor-dashboard-zone"], [data-testid="doctor-appointments-zone"]',
    );
    await expect(section).toHaveScreenshot(
      "doctor-workflow-dashboard-appointments-desktop.png",
    );
  });

  test("renders consultation and patients sections (desktop)", async ({
    page,
  }) => {
    const section = page.locator(
      '[data-testid="doctor-consultation-zone"], [data-testid="doctor-patients-zone"]',
    );
    await expect(section).toHaveScreenshot(
      "doctor-workflow-consultation-patients-desktop.png",
    );
  });

  test("renders full doctor workflow page (mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const section = page.locator('[data-testid="doctor-workflow-page"]');
    await expect(section).toHaveScreenshot(
      "doctor-workflow-full-mobile.png",
    );
  });
});
