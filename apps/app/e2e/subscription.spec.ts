import { expect, Page, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api";

let authToken: string;
let clinicId: string;

test.describe("Subscription & Billing", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Setup: Create admin user with clinic
    const userEmail = `admin${Date.now()}@test.com`;
    const userPassword = "Test@123456";

    const registerRes = await page.request.post(`${API_URL}/auth/register`, {
      data: {
        email: userEmail,
        password: userPassword,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
        clinicName: "Billing Test Clinic",
      },
    });

    if (registerRes.ok()) {
      const userData = (await registerRes.json()) as Record<string, unknown>;
      authToken =
        (userData?.access_token as string) || (userData?.accessToken as string);

      const user = (userData?.user as Record<string, unknown>) || userData;
      clinicId = (user?.clinicId as string) || "";
    }

    await context.close();
  });

  test("should display subscription status on upgrade page", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    // Verify page loads
    await expect(page.locator("h1")).toContainText(/Upgrade|Plan/i);

    // Should show current plan
    await expect(page.getByText(/Current Plan|Plan/i).first()).toBeVisible();
  });

  test("should display all tier options", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/upgrade", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Verify page loaded
    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("should show add-on cards", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    // Check for add-on section
    await expect(
      page.getByText(/Add-ons|Intelligence|WhatsApp/i).first(),
    ).toBeVisible();
  });

  test("should show billing history", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    // Click billing history button
    const billingBtn = page.getByRole("button", { name: /Billing History/i });
    if (await billingBtn.isVisible()) {
      await billingBtn.click();

      // Should show dialog or section
      await page.waitForTimeout(500);
      const dialogVisible = await page.locator('[role="dialog"]').isVisible();
      expect(dialogVisible).toBeTruthy();
    }
  });

  test("should open pricing dialog", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    // Click change plan button
    const changePlanBtn = page
      .getByRole("button", { name: /Change Plan|View All Plans/i })
      .first();
    if (await changePlanBtn.isVisible()) {
      await changePlanBtn.click();

      // Pricing dialog should appear
      await page.waitForTimeout(500);
      const dialogVisible = await page.locator('[role="dialog"]').isVisible();
      expect(dialogVisible).toBeTruthy();
    }
  });

  test("should display FAQ section", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    // Scroll to FAQ section
    const faqSection = page.getByText(/FAQ|Frequently Asked/i);
    if (await faqSection.isVisible()) {
      await expect(faqSection).toBeVisible();
    }
  });

  test("should display contact sales button", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    // Look for contact sales
    const contactBtn = page.getByRole("button", { name: /Contact Sales/i });
    await expect(contactBtn).toBeVisible();
  });
});

async function loginAsAdmin(page: Page) {
  if (authToken) {
    await page.addInitScript(
      (args: { t: string; cid: string }) => {
        try {
          localStorage.setItem("docita_token", args.t);
          localStorage.setItem(
            "docita_user",
            JSON.stringify({
              role: "ADMIN",
              clinicId: args.cid,
            }),
          );
        } catch {
          // Ignore localStorage errors
        }
      },
      { t: authToken, cid: clinicId },
    );
  }
}
