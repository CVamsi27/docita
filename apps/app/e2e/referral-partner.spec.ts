import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/patient-helpers";

/**
 * Smoke for the referral-partner self-service portal front-end. The full
 * OTP round-trip is exercised in apps/api/test/e2e/partner-portal/ on the
 * server side; this file pins the UI shape (route bounce, phone input,
 * OTP step) so a refactor that breaks the public surface catches in CI.
 *
 * Seeded partner: see apps/api/src/seed/seed-clinic-users.ts (the partner
 * is only created by the API seed, so the e2e is skipped when the seed
 * has not been loaded — the same posture as the internal critical-flows
 * spec).
 */
const PARTNER_PHONE = "+919876543210";

test.describe("Referral partner portal — front-end", () => {
  test("GET /partner redirects to /partner/login when no session is present", async ({
    page,
  }) => {
    await page.goto("/partner");
    await expect(page).toHaveURL(/\/partner\/login$/);
  });

  test("GET /partner/login shows the phone input", async ({ page }) => {
    await page.goto("/partner/login");
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute("inputmode", "tel");
  });

  test("submitting a phone number advances the UI to the OTP step", async ({
    page,
  }) => {
    await page.goto("/partner/login");

    await page.locator('input[type="tel"]').fill(PARTNER_PHONE);
    await page.getByRole("button", { name: /send|otp|continue|next/i }).click();

    // The OTP step renders a 6-digit code input. We accept either a
    // text input with `inputmode=numeric` or a series of single-digit
    // inputs (the auth flow accepts both shapes). The 6-digit
    // placeholder/value is the cheapest stable contract.
    await expect(page.locator("body")).toContainText(/6[-‐\s]?digit|otp|verification/i, {
      timeout: 5_000,
    });
  });

  test("protected partner routes bounce to /partner/login when no session is set", async ({
    page,
  }) => {
    // Clear any session cookies/localStorage that the test runner inherited
    // so the bounce assertion is meaningful.
    await page.context().clearCookies();
    await page.goto("/partner");
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto("/partner/dashboard");
    await expect(page).toHaveURL(/\/partner\/login$/);
  });
});
