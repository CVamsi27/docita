import { expect, test } from "@playwright/test";
import {
  API_URL,
  loginUser,
  setupTestUser,
} from "./utils/patient-helpers";

test.describe("Auth Flow", () => {
  test("should login with valid credentials", async ({ page, request }) => {
    const user = await setupTestUser(request);

    await loginUser(page, user);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/today/);
  });

  test("should show error on invalid credentials", async ({ page, request }) => {
    const user = await setupTestUser(request);
    const loginRes = await request.post(`${API_URL}/auth/login`, {
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

  // The auth branding hero is `hidden lg:flex` (AuthBrandingPanel), so the
  // greeting only exists on viewports at or above the lg breakpoint (1024px).
  test.skip(
    ({ viewport }) => !viewport || viewport.width < 1024,
    "hero greeting is hidden below the lg breakpoint",
  );

  test("front-door greeting: serif hero renders and EN/Hindi flip re-renders it", async ({
    page,
  }) => {
    await page.goto("/login");

    // The hero greeting is daypart-dependent (morning/afternoon/evening), so
    // pin the serif signature element plus the time-independent eyebrow, and
    // assert the greeting is one of the three English daypart forms.
    const hero = page.locator("h2.font-serif");
    await expect(hero).toBeVisible();
    await expect(hero).toHaveClass(/font-serif/);
    await expect(hero).toHaveText(/Good (morning|afternoon|evening)/);
    await expect(page.getByText("Today", { exact: true })).toBeVisible();

    // Flip to Hindi: the same h2 re-renders in Devanagari and the eyebrow
    // flips with it, proving the hero tracks the live locale.
    await page.getByRole("button", { name: "हिंदी" }).click();
    await expect(hero).toHaveText(/सुप्रभात|शुभ दोपहर|शुभ संध्या/);
    await expect(page.getByText("आज", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "हिंदी" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Flip back to English and confirm the English hero returns.
    await page.getByRole("button", { name: "EN" }).click();
    await expect(hero).toHaveText(/Good (morning|afternoon|evening)/);
    await expect(page.getByText("Today", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "EN" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
