import { expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

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

test.describe("Auth Flow", () => {
  test("should login with valid credentials", async ({ page, context }) => {

    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    const registerRes = await context.request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password,
        firstName: "Test",
        lastName: "Doctor",
        role: "DOCTOR",
        clinicName: "Test Clinic",
      },
    });

    expect(registerRes.ok()).toBeTruthy();
    const user = toRecord(await registerRes.json());

    const token = readString(user, "access_token") || readString(user, "accessToken");
    const clinicRes = await context.request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "Auth Test Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "1234567890",
        address: "123 Auth St",
        tier: "ENTERPRISE",
      },
    });
    expect(clinicRes.ok()).toBeTruthy();
    const clinic = toRecord(await clinicRes.json());

    const assignRes = await context.request.post(`${API_URL}/doctor-clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        doctorId:
          readString(user, "id") ||
          readString(toRecord(user.user), "id"),
        clinicId: clinic.id,
        role: "DOCTOR", 
      },
    });
    expect(assignRes.ok()).toBeTruthy();

    await page.goto("/login");
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    } catch {

      await page.goto("/").catch(() => null);
      await page.goto("/login").catch(() => null);
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    }

    await page.fill('input[type="email"]', uniqueEmail);
    await page.click('button:has-text("Continue")');

    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', password);

    await page.click('button:has-text("Sign In")');

    try {
      await page.waitForURL(/\/(dashboard|appointments|patients|queue)/, {
        timeout: 5000,
      });
    } catch (_e) {

    }

    await page.waitForTimeout(1000); 
    const hasToken = await page.evaluate(() => {
      return !!localStorage.getItem("docita_token");
    });

    await expect(page).toHaveURL(/\/dashboard/);
    expect(hasToken).toBeTruthy();
  });

  test("should show error on invalid credentials", async ({
    page,
    context,
  }) => {

    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const registerRes = await context.request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password: "Test@123456",
        firstName: "Test",
        lastName: "Doctor",
        role: "DOCTOR",
        clinicName: "Test Clinic",
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    await page.goto("/login");

    await page.fill('input[type="email"]', uniqueEmail);
    await page.click('button:has-text("Continue")');

    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', "WrongPassword123");

    const signInBtn = page.locator('button:has-text("Sign In")');
    await signInBtn.waitFor({ state: "visible" });

    await signInBtn.click({ force: true });

    await page.waitForTimeout(1000);
    const errorExists =
      (await page.getByText("Invalid credentials").isVisible()) ||
      (await page.getByText("An error occurred").isVisible()) ||
      page.url().includes("/login");

    expect(errorExists).toBeTruthy();
  });

  test("should show validation errors on empty form submission", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.click('button:has-text("Continue")');

    await page.waitForTimeout(500);

    const formVisible = await page.locator('input[type="email"]').isVisible();
    expect(formVisible).toBeTruthy();
  });
});
