import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { setupTestUser, TEST_PASSWORD } from "./patient-helpers";

export async function uiLogin(page: Page, params: { email: string; password: string }) {
  // If already logged in, don't re-run login flow.
  await page.goto("/dashboard").catch(() => null);
  if (await page.getByRole("link", { name: "Dashboard" }).isVisible().catch(() => false)) {
    return;
  }

  await page.goto("/login");
  const passwordField = page.locator('input[type="password"]').first();

  // If we're already on the password step (e.g. cached smart-auth state), skip the email step.
  const alreadyOnPasswordStep = await passwordField
    .isVisible({ timeout: 3000 })
    .catch(() => false);
  if (!alreadyOnPasswordStep) {
    await page.getByLabel("Email Address").fill(params.email);
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Continue" }).click();
  }

  const isPasswordVisible = await passwordField
    .isVisible({ timeout: 15000 })
    .catch(() => false);
  if (!isPasswordVisible) {
    // If the app is already authenticated, /login might redirect away.
    if (await page.getByRole("link", { name: "Dashboard" }).isVisible().catch(() => false)) {
      return;
    }
    throw new Error("Login flow did not reach password step.");
  }

  await passwordField.fill(params.password);
  await page.getByRole("button", { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function loginAsRole(
  page: Page,
  request: APIRequestContext,
  _role: "ADMIN_DOCTOR" | "DOCTOR" | "ADMIN" = "ADMIN_DOCTOR",
) {
  const user = await setupTestUser(request);
  await uiLogin(page, { email: user.email, password: TEST_PASSWORD });
  return user;
}

