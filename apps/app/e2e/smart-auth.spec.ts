import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/patient-helpers";

test.describe("Smart Authentication Flow", () => {
  let uniqueEmail: string;
  let newUserEmail: string;
  const password = "Test@123456";

  test.beforeEach(async ({ page, request }) => {

    uniqueEmail = `doctor${Date.now()}${Math.floor(Math.random() * 1000)}@test.com`;

    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password: password,
        firstName: "Test",
        lastName: "Doctor",
        role: "DOCTOR",
        clinicName: "Test Clinic",
      },
    });
    expect(registerRes.ok()).toBeTruthy();

    const userData = await registerRes.json();
    const token = userData.access_token || userData.accessToken;

    const clinicRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "Test Clinic " + Date.now(),
        email: `clinic${Date.now()}@test.com`,
        phone: "1234567890",
        address: "123 Test St",
        tier: "ENTERPRISE",
      },
    });
    expect(clinicRes.ok()).toBeTruthy();
    const clinic = await clinicRes.json();

    const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        doctorId: userData.user.id,
        clinicId: clinic.id,
        role: "DOCTOR",
        clinicName: "Test Clinic",
      },
    });
    expect(assignRes.ok()).toBeTruthy();

    newUserEmail = `newuser${Date.now()}${Math.floor(Math.random() * 1000)}@test.com`;

    await page.goto("/login");
  });

  test("should show email entry form initially", async ({ page }) => {
    await expect(
      page.getByText("Welcome to Docita", { exact: false }),
    ).toBeVisible();
    await expect(page.getByText("Enter your email to continue")).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("should show login form for existing user", async ({ page }) => {
    await page.getByLabel("Email address").fill(uniqueEmail);

    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByText("Sign in to your workspace")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toHaveValue(uniqueEmail);
    await expect(emailInput).toBeDisabled();
  });

  test("should show signup form for new user", async ({ page }) => {
    await page.getByLabel("Email address").fill(newUserEmail);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Create your account")).toBeVisible();
    await expect(page.getByText("Get started with Docita")).toBeVisible();
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Clinic Name")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Account" }),
    ).toBeVisible();

    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toHaveValue(newUserEmail);
    await expect(emailInput).toBeDisabled();
  });

  test("should allow going back to change email", async ({ page }) => {
    await page.getByLabel("Email address").fill(uniqueEmail);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Welcome back")).toBeVisible();

    await page.getByRole("button", { name: "Go back" }).first().click();

    await expect(
      page.getByText("Welcome to Docita", { exact: false }),
    ).toBeVisible();
    const emailInput = page.getByLabel("Email address");
    await expect(emailInput).toHaveValue(uniqueEmail);
    await expect(emailInput).not.toBeDisabled();
  });

  test("should login existing user successfully", async ({ page }) => {
    await page.getByLabel("Email address").fill(uniqueEmail);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Welcome back")).toBeVisible();

    await page.getByLabel("Password").fill(password);

    const signInBtn = page.getByRole("button", { name: "Sign in" });
    await signInBtn.waitFor({ state: "visible" });

    await page.waitForTimeout(500);
    await signInBtn.click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.getByLabel("Email address").fill(uniqueEmail);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Welcome back")).toBeVisible();

    await page.getByLabel("Password").fill("WrongPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByText(/Invalid credentials|Login failed|error/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should toggle password visibility", async ({ page }) => {
    await page.getByLabel("Email address").fill(uniqueEmail);
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Welcome back")).toBeVisible();

    const passwordInput = page.getByLabel("Password");
    const toggleButton = page.getByRole("button", {
      name: /show password|hide password/i,
    });

    await expect(passwordInput).toHaveAttribute("type", "password");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should validate email format", async ({ page }) => {
    const emailInput = page.getByLabel("Email address");

    await emailInput.fill("invalid-email");
    await page.getByRole("button", { name: "Continue" }).click();

    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMessage).toBeTruthy();
  });
});
