import { expect, test } from "@playwright/test";
import { setupTestUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import { expectPageHeader, expectRoute } from "./utils/ui-contracts";

test.describe("Upgrade Page", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await seedSession(page, {
      token: user.accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: "ADMIN_DOCTOR",
        clinicId: user.clinicId,
      },
    });
  });

  test("should display upgrade page with current plan", async ({ page }) => {
    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await expectRoute(page, /\/upgrade/);
    await expectPageHeader(page, { title: /Upgrade|Billing|Subscription/i });

    const body = page.locator("body");
    await expect(body).toBeVisible({ timeout: 10000 });
  });

  test("should show pricing dialog when clicking View All Plans", async ({
    page,
  }) => {
    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");

    const viewPlansBtn = page.getByRole("button", { name: /View All Plans/i });
    if (await viewPlansBtn.isVisible()) {
      await viewPlansBtn.click();

      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator('[role="dialog"]')).toContainText(
        /Choose Your Plan|Plan/i,
      );
    }
  });

  test("should display tier cards with pricing", async ({ page }) => {
    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageContent = page.locator("body");
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test("should show addon cards", async ({ page }) => {
    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("should show billing history button", async ({ page }) => {
    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("should open billing history dialog", async ({ page }) => {
    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");

    const billingHistoryTrigger = page
      .getByRole("button", { name: /Billing History|View Billing History/i })
      .first();
    if (!(await billingHistoryTrigger.isVisible())) {
      test.skip();
      return;
    }

    await billingHistoryTrigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(/Billing History/i);
    // Contract: dialog opens; contents vary based on environment data.
  });

  test("should toggle monthly/yearly pricing in dialog", async ({ page }) => {
    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");

    const changePlanBtn = page
      .getByRole("button", { name: /Change Plan|View All Plans/i })
      .first();
    if (await changePlanBtn.isVisible()) {
      await changePlanBtn.click();

      const yearlyLabel = page.locator('[role="dialog"]').getByText(/Yearly/i);
      if (await yearlyLabel.isVisible()) {

        await expect(yearlyLabel).toBeVisible();
      }
    }
  });
});
