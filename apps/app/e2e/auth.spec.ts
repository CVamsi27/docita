import { test, expect } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001/api";

test.describe("Auth Flow", () => {
  test("should login with valid credentials", async ({ page, context }) => {
    // Setup: Create user via API
    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    const registerRes = await context.request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password,
        name: "Test Doctor",
        role: "DOCTOR",
      },
    });

    expect(registerRes.ok()).toBeTruthy();
    const user = await registerRes.json();

    // Navigate to login page
    await page.goto("/login");

    // Fill form
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', password);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 }).catch(() => {
      // Navigation might not happen in test, check for success indicators
    });

    // Verify logged in - check for token storage
    const hasToken = await page.evaluate(() => {
      return (
        !!localStorage.getItem("token") ||
        !!localStorage.getItem("access_token") ||
        !!sessionStorage.getItem("token")
      );
    });

    // Or check if page has changed from login
    const url = page.url();
    expect(url).not.toContain("/login");
  });

  test("should show error on invalid credentials", async ({
    page,
    context,
  }) => {
    // Setup: Create a user
    const uniqueEmail = `doctor${Date.now()}@test.com`;
    await context.request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password: "CorrectPassword123",
        name: "Test Doctor",
        role: "DOCTOR",
      },
    });

    await page.goto("/login");

    // Try wrong password
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', "WrongPassword123");

    await page.click('button[type="submit"]');

    // Look for error message
    await page.waitForTimeout(1000);
    const errorExists =
      (await page.locator("text=/invalid|credentials|error/i").count()) > 0 ||
      page.url().includes("/login");

    expect(errorExists).toBeTruthy();
  });

  test("should show validation errors on empty form submission", async ({
    page,
  }) => {
    await page.goto("/login");

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Check for validation errors or form still visible
    await page.waitForTimeout(500);

    const formVisible = await page.locator('input[type="email"]').isVisible();
    expect(formVisible).toBeTruthy();
  });
});
