import { expect, test } from "@playwright/test";

test.describe("Clinic Registration Flow", () => {
  async function registerAndOpenOnboarding(page: import("@playwright/test").Page) {
    const uniqueId = Date.now();
    const email = `owner-${uniqueId}@example.com`;
    const password = "Test@123456";

    await page.goto("/login");
    await page.fill('input[id="email"]', email);
    await page.click('button:has-text("Continue")');

    await expect(page.getByText("Create your account")).toBeVisible();
    await page.fill('input[id="firstName"]', "Clinic");
    await page.fill('input[id="lastName"]', "Owner");
    await page.fill('input[id="signup-password"]', password);

    await page.click('button[role="combobox"]#signup-owner-role');
    await page.getByRole("option", { name: "Admin Doctor" }).click();

    await page.click('button:has-text("Create Account")');

    await page.waitForURL(/\/clinic-selection/, { timeout: 30000 });
    await page.click('a:has-text("Continue to Onboarding")');
    await page.waitForURL(/\/onboarding/, { timeout: 30000 });
  }

  test("should complete full clinic registration wizard", async ({ page }) => {
    await registerAndOpenOnboarding(page);

    await expect(page.locator("h1")).toContainText("Welcome to Docita");
    await expect(page.getByText("Step 1: Clinic Details")).toBeVisible();

    const uniqueId = Date.now();
    const clinicName = `E2E Clinic ${uniqueId}`;
    const clinicEmail = `clinic${uniqueId}@example.com`;

    const randomPhone =
      "9" +
      Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, "0");

    await page.fill('input[id="name"]', clinicName);

    await page.click('button[role="combobox"]');
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await page.fill('input[id="email"]', clinicEmail);
    await page.fill('input[id="phone"]', randomPhone);
    await page.fill('input[id="address"]', "123 Tech Park, Cyber City");

    await page.click('button:has-text("Next: Choose Plan")');

    await expect(page.getByText("Choose Your Plan")).toBeVisible();

    await page.getByText("Capture", { exact: true }).first().click();

    await page.click('button:has-text("Continue with")');

    await expect(page.getByText("Step 3: Team Planning")).toBeVisible();
    await expect(page.getByText("Clinic Owner (already added)")).toBeVisible();
    await expect(page.getByText("Admin Doctor")).toBeVisible();

    await page.click('button:has-text("Skip for Now")');

    await expect(page.getByText("Step 4: Compliance and Legal")).toBeVisible();

    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZxXQAAAAASUVORK5CYII=",
      "base64",
    );
    await page.setInputFiles('input[type="file"]', {
      name: "signature.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    await page.click('button:has-text("Service Level Agreement (SLA)")');
    await expect(page.getByText("Review the SLA terms before accepting this agreement.")).toBeVisible();
    await page.click('button:has-text("I Agree")');
    await expect(page.locator("#sla")).toBeChecked();

    await page.click('button:has-text("Privacy Policy & Data Consent")');
    await expect(page.getByText("Review privacy and consent terms before accepting this agreement.")).toBeVisible();
    await page.click('button:has-text("I Agree")');
    await expect(page.locator("#privacy")).toBeChecked();

    await page.click('button:has-text("Data Processing Agreement (DPDP Compliant)")');
    await expect(page.getByText("Review data processing obligations before accepting this agreement.")).toBeVisible();
    await page.click('button:has-text("I Agree")');
    await expect(page.locator("#dpa")).toBeChecked();

    await page.uncheck("#requireConsent");

    await page.click("button:has-text('Complete Registration')");

    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  });

  test("should validate required fields in step 1", async ({ page }) => {
    await registerAndOpenOnboarding(page);

    await page.click('button:has-text("Next: Choose Plan")');

    await expect(
      page.getByText("Clinic name must be at least 2 characters"),
    ).toBeVisible();
    await expect(page.getByText("Invalid email address")).toBeVisible(); 
  });
});
