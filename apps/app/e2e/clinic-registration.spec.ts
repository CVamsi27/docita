import { expect, test } from "@playwright/test";

test.describe("Clinic Registration Flow", () => {
  // We can't easily clean up the created clinic/user in E2E without a dedicated API
  // So we use unique data for each run

  test("should complete full clinic registration wizard", async ({ page }) => {
    // 1. Navigate to Onboarding
    await page.goto("/onboarding");

    // Verify we are on Step 1: Clinic Details
    await expect(page.locator("h1")).toContainText("Welcome to Docita");
    await expect(page.getByText("Clinic Details")).toBeVisible();

    const uniqueId = Date.now();
    const clinicName = `E2E Clinic ${uniqueId}`;
    const clinicEmail = `clinic${uniqueId}@example.com`;
    const adminEmail = `admin${uniqueId}@example.com`;
    // Generate valid 10-digit phone
    const randomPhone =
      "9" +
      Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, "0");

    // 2. Fill Clinic Details
    await page.fill('input[id="name"]', clinicName);
    // Select Clinic Type
    await page.click('button[role="combobox"]'); // Trigger for Select
    await expect(
      page.getByRole("option", { name: "General Medicine" }),
    ).toBeVisible();
    await page.getByRole("option", { name: "General Medicine" }).click();

    await page.fill('input[id="email"]', clinicEmail);
    await page.fill('input[id="phone"]', randomPhone);
    await page.fill('input[id="address"]', "123 Tech Park, Cyber City");

    await page.click('button:has-text("Next: Admin Account")');

    // 3. Fill Admin Account
    await expect(page.getByText("Admin Account Setup")).toBeVisible();

    await page.fill('input[id="adminName"]', "Dr. Test Admin");
    await page.fill('input[id="adminEmail"]', adminEmail);
    await page.fill('input[id="password"]', "Test@123456"); // Meets regex requirements
    await page.fill('input[id="adminPhone"]', randomPhone);

    await page.click('button:has-text("Next: Select Plan")');

    // 3. Plan Selection (Step 3) - Select Free Plan to skip payment
    await expect(page.getByText("Choose Your Plan")).toBeVisible();

    // Find Capture/Free plan card - might need specific text selector
    // Based on PlanSelectionStep.tsx, it shows "Free"
    await page.click('text="Free"');

    // Click Continue
    await page.click('button:has-text("Continue with")');

    // 4. Team Invite (Step 5 - Payment skipped)
    // Check if we are on Team Invite step
    await expect(page.getByText("Invite Team Members")).toBeVisible();

    // Skip team invite
    await page.click('button:has-text("Skip for now")');

    // 5. Compliance & Legal (Step 6)
    await expect(page.getByText("Compliance & Legal")).toBeVisible();

    // Check all required legal checkboxes
    await page.check("#sla");
    // Privacy policy involves a consent modal
    await page.click("#privacy"); // Triggers modal
    await expect(page.getByText("Data Privacy & Consent Notice")).toBeVisible();

    // Check required consents in the modal
    await page.check("#medical_records");
    await page.check("#data_storage");
    await page.check("#data_sharing");

    // Click Agree
    await page.click('button:has-text("I Agree")');

    // Verify it is now checked
    await expect(page.locator("#privacy")).toBeChecked();
    await page.check("#dpa");

    // Optional consent configuration
    await page.uncheck("#requireConsent");

    // 6. Submit and verify success
    await page.click("button:has-text('Complete Registration')");

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  });

  test("should validate required fields in step 1", async ({ page }) => {
    await page.goto("/onboarding");

    // Try to click Next without filling anything
    await page.click('button:has-text("Next: Admin Account")');

    // Expect validation errors
    await expect(
      page.getByText("Clinic name must be at least 2 characters"),
    ).toBeVisible();
    await expect(page.getByText("Invalid email address")).toBeVisible(); // Or similar message
  });
});
