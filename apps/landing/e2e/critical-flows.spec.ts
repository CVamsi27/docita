import { expect, test } from "@playwright/test";

test("homepage renders primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Clinic Ops, Simplified" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Free Trial" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Talk to Sales" }).first()).toBeVisible();
});

test("legal pages are reachable", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();

  await page.goto("/cookies");
  await expect(page.getByRole("heading", { name: "Cookie Policy" })).toBeVisible();
});

test("contact inquiry form validation and submit path", async ({ page }) => {
  let csrfHeader: string | undefined;

  await page.route("**/api/v1/contact/inquiry", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    csrfHeader = route.request().headers()["x-xsrf-token"];

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "inquiry_test_001",
        message: "ok",
      }),
    });
  });

  await page.goto("/contact");
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    document.cookie = "XSRF-TOKEN=e2e-csrf-token; path=/";
  });

  await page.locator("form").getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText("Name is required", { exact: true })).toBeVisible();
  await expect(page.getByText("Email is required", { exact: true })).toBeVisible();

  await page.getByLabel("Full Name *").fill("Dr. Test User");
  await page.getByLabel("Email *").fill("doctor@example.com");
  await page.getByLabel("Clinic Name *").fill("Demo Clinic");
  await page
    .getByLabel("Message *")
    .fill("We want to evaluate Docita for appointment and billing workflows.");

  await page.locator("form").getByRole("button", { name: "Send Message" }).click();

  await expect(
    page.getByText("Message sent successfully"),
  ).toBeVisible({ timeout: 15000 });
  expect(csrfHeader).toBe("e2e-csrf-token");
});
