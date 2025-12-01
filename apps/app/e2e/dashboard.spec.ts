import { test, expect } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001/api";

test.describe("Dashboard", () => {
  let user: any;

  test.beforeEach(async ({ page, context }) => {
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
    user = await registerRes.json();

    // Login
    await page.goto("/login");
    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/");
  });

  test("should load dashboard with all sections", async ({ page }) => {
    // Check header
    await expect(page.locator("h1")).toContainText("Good");
    await expect(page.locator("h1")).toContainText("Test");

    // Check stats cards
    await expect(page.getByText("Patients", { exact: true })).toBeVisible();
    await expect(page.getByText("Today", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Prescriptions", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();

    // Check quick actions
    await expect(page.getByText("New Patient")).toBeVisible();
    await expect(page.getByText("Schedule")).toBeVisible();
    await expect(page.getByText("Queue", { exact: true })).toBeVisible();
    await expect(page.getByText("Invoice")).toBeVisible();

    // Check schedule section
    await expect(page.getByText("Today's Schedule")).toBeVisible();

    // Check recent patients section
    await expect(page.getByText("Recent Patients")).toBeVisible();
  });

  test("should navigate to patients page from quick action", async ({
    page,
  }) => {
    await page.click('text="New Patient"');
    await expect(page).toHaveURL(/.*\/patients\?action=new/);
  });

  test("should navigate to appointments page from quick action", async ({
    page,
  }) => {
    await page.click('text="Schedule"');
    await expect(page).toHaveURL(/.*\/appointments\?action=new/);
  });
});
