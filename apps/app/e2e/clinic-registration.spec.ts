import { expect, test } from "@playwright/test";

test.describe("Clinic Registration Flow", () => {

  test("should complete full clinic registration wizard", async ({ page }) => {

    await page.goto("/onboarding");

    await expect(page.locator("h1")).toContainText("Welcome to Docita");
    await expect(page.getByText("Clinic Details")).toBeVisible();

    const uniqueId = Date.now();
    const clinicName = `E2E Clinic ${uniqueId}`;
    const clinicEmail = `clinic${uniqueId}@example.com`;
    const adminEmail = `admin${uniqueId}@example.com`;

    const randomPhone =
      "9" +
      Math.floor(Math.random() * 1000000000)
        .toString()
        .padStart(9, "0");

    await page.fill('input[id="name"]', clinicName);

    await page.click('button[role="combobox"]'); 
    await expect(
      page.getByRole("option", { name: "General Medicine" }),
    ).toBeVisible();
    await page.getByRole("option", { name: "General Medicine" }).click();

    await page.fill('input[id="email"]', clinicEmail);
    await page.fill('input[id="phone"]', randomPhone);
    await page.fill('input[id="address"]', "123 Tech Park, Cyber City");

    await page.click('button:has-text("Next: Admin Account")');

    await expect(page.getByText("Admin Account Setup")).toBeVisible();

    await page.fill('input[id="adminName"]', "Dr. Test Admin");
    await page.fill('input[id="adminEmail"]', adminEmail);
    await page.fill('input[id="password"]', "Test@123456"); 
    await page.fill('input[id="adminPhone"]', randomPhone);

    await page.click('button:has-text("Next: Select Plan")');

    await expect(page.getByText("Choose Your Plan")).toBeVisible();

    await page.click('text="Free"');

    await page.click('button:has-text("Continue with")');

    await expect(page.getByText("Invite Team Members")).toBeVisible();

    await page.click('button:has-text("Skip for now")');

    await expect(page.getByText("Compliance & Legal")).toBeVisible();

    await page.check("#sla");

    await page.click("#privacy"); 
    await expect(page.getByText("Data Privacy & Consent Notice")).toBeVisible();

    await page.check("#medical_records");
    await page.check("#data_storage");
    await page.check("#data_sharing");

    await page.click('button:has-text("I Agree")');

    await expect(page.locator("#privacy")).toBeChecked();
    await page.check("#dpa");

    await page.uncheck("#requireConsent");

    await page.click("button:has-text('Complete Registration')");

    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  });

  test("should validate required fields in step 1", async ({ page }) => {
    await page.goto("/onboarding");

    await page.click('button:has-text("Next: Admin Account")');

    await expect(
      page.getByText("Clinic name must be at least 2 characters"),
    ).toBeVisible();
    await expect(page.getByText("Invalid email address")).toBeVisible(); 
  });
});
