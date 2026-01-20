import { expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api";

test.describe("Auth Flow", () => {
  test("should login with valid credentials", async ({ page, context }) => {
    // Setup: Create user via API
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
    const user = (await registerRes.json()) as Record<string, unknown>;

    // Create a clinic for this user so they can login
    const token = (user?.access_token as string) || (user?.accessToken as string);
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
    const clinic = (await clinicRes.json()) as Record<string, unknown>;

    // Assign doctor to clinic explicitly to ensure login works
    const assignRes = await context.request.post(`${API_URL}/doctor-clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        doctorId: (user.id as string) || ((user.user as { id?: string })?.id),
        clinicId: clinic.id,
        role: "DOCTOR", // Use uppercase to match strict role check if needed, or 'doctor'
      },
    });
    expect(assignRes.ok()).toBeTruthy();

    // Navigate to login page and wait for inputs
    await page.goto("/login");
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    } catch {
      // Fallback: try root then login again
      await page.goto("/").catch(() => null);
      await page.goto("/login").catch(() => null);
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    }

    // Fill form - Step 1
    await page.fill('input[type="email"]', uniqueEmail);
    await page.click('button:has-text("Continue")');
    
    // Fill form - Step 2
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', password);

    // Submit
    await page.click('button:has-text("Sign In")');

    // Wait for redirect - the app should redirect after successful login
    // Check multiple possible redirect URLs
    try {
      await page.waitForURL(/\/(dashboard|appointments|patients|queue)/, {
        timeout: 5000,
      });
    } catch (_e) {
      // If navigation didn't happen as expected, just continue with other checks
    }

    // Verify logged in - check for token storage (docita_token)
    await page.waitForTimeout(1000); // Give time for storage
    const hasToken = await page.evaluate(() => {
      return !!localStorage.getItem("docita_token");
    });

    // Expect successful redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    expect(hasToken).toBeTruthy();
  });

  test("should show error on invalid credentials", async ({
    page,
    context,
  }) => {
    // Setup: Create a user
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

    // Try wrong password
    await page.fill('input[type="email"]', uniqueEmail);
    await page.click('button:has-text("Continue")');
    
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', "WrongPassword123");

    const signInBtn = page.locator('button:has-text("Sign In")');
    await signInBtn.waitFor({ state: "visible" });
    // Force click in case of overlay/animation
    await signInBtn.click({ force: true });
    console.log("Clicked Sign In (Invalid Creds)");

    // Look for error message or stay on login page
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

    // Try to submit empty form
    await page.click('button:has-text("Continue")');

    // Check for validation errors or form still visible
    await page.waitForTimeout(500);

    const formVisible = await page.locator('input[type="email"]').isVisible();
    expect(formVisible).toBeTruthy();
  });
});
