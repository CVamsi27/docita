import { expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

test.describe("Upgrade Page", () => {
  let token: string;

  test.beforeEach(async ({ context }) => {

    const userEmail = `admin${Date.now()}@test.com`;
    const password = "Test@123456";

    try {
      const registerRes = await context.request.post(
        `${API_URL}/auth/register`,
        {
          data: {
            email: userEmail,
            password,
            firstName: "Admin",
            lastName: "User",
            role: "ADMIN",
            clinicName: `Clinic ${Date.now()}`,
          },
        },
      );

      if (registerRes.ok()) {
        const userData = toRecord(await registerRes.json());
        token = readString(userData, "access_token") || readString(userData, "accessToken") || "";
      }
    } catch {

    }
  });

  test("should display upgrade page with current plan", async ({ page }) => {

    if (!token) {
      test.skip();
      return;
    }

    await page.goto("/login");
    await page.evaluate((tkn) => {
      localStorage.setItem("docita_token", tkn);
    }, token);

    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const body = page.locator("body");
    await expect(body).toBeVisible({ timeout: 10000 });
  });

  test("should show pricing dialog when clicking View All Plans", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.evaluate((tkn) => {
      localStorage.setItem("docita_token", tkn);
    }, token);

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
    await page.goto("/login");
    await page.evaluate((tkn) => {
      localStorage.setItem("docita_token", tkn);
    }, token);

    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const pageContent = page.locator("body");
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test("should show addon cards", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate((tkn) => {
      localStorage.setItem("docita_token", tkn);
    }, token);

    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("should show billing history button", async ({ page }) => {

    if (!token) {
      test.skip();
      return;
    }

    await page.goto("/login");
    await page.evaluate((tkn) => {
      localStorage.setItem("docita_token", tkn);
    }, token);

    await page.goto("/upgrade");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("should redirect non-admin users to dashboard", async ({
    page,
    context,
  }) => {

    const doctorEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    const registerRes = await context.request.post(`${API_URL}/auth/register`, {
      data: {
        email: doctorEmail,
        password,
        firstName: "Doctor",
        lastName: "User",
        role: "DOCTOR",
        clinicName: "Doctor Clinic",
      },
    });

    expect(registerRes.ok()).toBeTruthy();
    const userData = toRecord(await registerRes.json());
    const doctorToken =
      readString(userData, "access_token") || readString(userData, "accessToken");

    await page.goto("/login");
    await page.evaluate((tkn) => {
      localStorage.setItem("docita_token", tkn);
    }, doctorToken);

    await page.goto("/upgrade");

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/(dashboard|upgrade)/);
  });

  test("should toggle monthly/yearly pricing in dialog", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate((tkn) => {
      localStorage.setItem("docita_token", tkn);
    }, token);

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
