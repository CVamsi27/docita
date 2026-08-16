import { expect, test } from "@playwright/test";

test.describe("Reset password", () => {
  test("shows the expired-link state when no token is present", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    await expect(
      page.getByRole("heading", { name: /Reset Link Expired/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Request Password Reset/i }),
    ).toBeVisible();
  });

  test("renders the reset form when a token query param is present", async ({
    page,
  }) => {
    await page.goto("/reset-password?token=test-token");

    await expect(
      page.getByRole("heading", { name: /Set New Password/i }),
    ).toBeVisible();
    // The floating field renders the required asterisk inside the label
    // (accessible name "New password *" / "Confirm new password *"), so
    // anchor on the label prefix and stay exact about which field.
    await expect(page.getByLabel(/^New password/)).toBeVisible();
    await expect(page.getByLabel(/^Confirm new password/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Reset Password/i }),
    ).toBeVisible();
  });

  test("does not render decorative animation classes", async ({ page }) => {
    await page.goto("/reset-password?token=test-token");

    const animated = await page
      .locator(".animate-in")
      .filter({ has: page.getByRole("heading", { name: /Set New Password/i }) })
      .count();
    expect(animated).toBe(0);
  });
});
