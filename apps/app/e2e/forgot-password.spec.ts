import { expect, test } from "@playwright/test";

test.describe("Forgot password", () => {
  test("renders the reset form with the standard heading and submit button", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { name: /Reset Password/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Send Reset Link/i }),
    ).toBeVisible();
  });

  test("validates that an email is provided", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.getByRole("button", { name: /Send Reset Link/i }).click();

    await expect(
      page.getByText(/please enter a valid email/i),
    ).toBeVisible();
  });

  test("preserves the back link to the sign-in flow", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("button", { name: /Back to Sign In/i }),
    ).toBeVisible();
  });
});
