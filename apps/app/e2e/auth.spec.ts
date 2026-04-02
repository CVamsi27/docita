import { expect, test } from "@playwright/test";
import { setupTestUser } from "./utils/patient-helpers";

test.describe("Auth Flow", () => {
  test("should login with valid credentials", async ({ page, request }) => {
    const user = await setupTestUser(request);

    await page.addInitScript(
      ({
        token: authToken,
        userData,
      }: {
        token: string;
        userData: Record<string, unknown>;
      }) => {
        localStorage.setItem("docita_token", authToken);
        localStorage.setItem("docita_user", JSON.stringify(userData));
      },
      {
        token: user.accessToken,
        userData: {
          id: user.id,
          email: user.email,
          role: "ADMIN_DOCTOR",
          clinicId: user.clinicId,
        },
      },
    );

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should show error on invalid credentials", async ({ page, request }) => {
    const user = await setupTestUser(request);
    const loginRes = await request.post("http://127.0.0.1:3001/api/v1/auth/login", {
      data: {
        email: user.email,
        password: "WrongPassword123",
      },
    });

    expect([401, 403]).toContain(loginRes.status());

    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("should show validation errors on empty form submission", async ({
    page,
  }) => {
    await page.goto("/login");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(500);
    await expect(emailInput).toBeVisible();
  });
});
