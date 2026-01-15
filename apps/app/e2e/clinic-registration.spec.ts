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

    // 2. Fill Clinic Details
    await page.fill('input[id="name"]', clinicName);
    // Select Clinic Type
    await page.click('button[role="combobox"]'); // Trigger for Select
    await page.click('div[role="option"] >> text=General Practice'); 
    
    await page.fill('input[id="email"]', clinicEmail);
    await page.fill('input[id="phone"]', "9876543210");
    await page.fill('input[id="address"]', "123 Tech Park, Cyber City");
    
    await page.click('button:has-text("Next: Admin Account")');

    // 3. Fill Admin Account
    await expect(page.getByText("Admin Account Setup")).toBeVisible();
    
    await page.fill('input[id="adminName"]', "Dr. Test Admin");
    await page.fill('input[id="adminEmail"]', adminEmail);
    await page.fill('input[id="password"]', "Test@123456"); // Meets regex requirements
    await page.fill('input[id="adminPhone"]', "9876543210");

    await page.click('button:has-text("Next: Compliance & Legal")');

    // 4. Compliance & Legal
    await expect(page.getByText("Compliance & Legal")).toBeVisible();
    
    // Check all required legal checkboxes
    await page.click('label[for="sla"]'); 
    await page.click('label[for="privacy"]');
    await page.click('label[for="dpa"]');
    
    // Optional consent configuration
    await page.click('label[for="requireConsent"]'); // Toggle it (default is true, so this might uncheck? Need to check default state. Code said default true. Let's assume we keep it.)
    // Actually, checking "checked" state is safer. But simple click will toggle.
    // If we want to ensure it's checked:
    const consentCheckbox = page.locator('input[id="requireConsent"]');
    if (!(await consentCheckbox.isChecked())) {
        await page.click('label[for="requireConsent"]');
    }

    // 5. Submit
    await page.click('button:has-text("Complete Registration")');

    // 6. Verify Success
    // Should show success toast and redirect
    await expect(page.getByText("Registration Successful")).toBeVisible();
    
    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test("should validate required fields in step 1", async ({ page }) => {
    await page.goto("/onboarding");
    
    // Try to click Next without filling anything
    await page.click('button:has-text("Next: Admin Account")');
    
    // Expect validation errors
    await expect(page.getByText("Clinic name must be at least 2 characters")).toBeVisible();
    await expect(page.getByText("Invalid email address")).toBeVisible(); // Or similar message
  });
});
