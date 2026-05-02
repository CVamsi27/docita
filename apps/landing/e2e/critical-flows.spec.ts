import { expect, type Page, test } from "@playwright/test";

async function waitForContactFormHydration(page: Page) {
  await page.waitForFunction(() => {
    const island = document.querySelector(
      'astro-island[component-export="ContactInquiryForm"]',
    );
    return island ? !island.hasAttribute("ssr") : false;
  });
}

test("homepage renders primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "One rhythm for your whole OPD floor. Queue, chart, bill, follow up—without the shuffle.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start clinic setup" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Book guided demo" }).first(),
  ).toBeVisible();
});

test("legal pages are reachable", async ({ page }) => {
  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy Policy" }),
  ).toBeVisible();

  await page.goto("/terms");
  await expect(
    page.getByRole("heading", { name: "Terms of Service" }),
  ).toBeVisible();

  await page.goto("/cookies");
  await expect(
    page.getByRole("heading", { name: "Cookie Policy" }),
  ).toBeVisible();
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
  await waitForContactFormHydration(page);
  await page.evaluate(() => {
    document.cookie = "XSRF-TOKEN=e2e-csrf-token; path=/";
  });

  await page
    .locator("form")
    .getByRole("button", { name: "Request setup" })
    .click();
  await expect(
    page.getByText("Enter your name", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Enter your email address", { exact: true }),
  ).toBeVisible();

  await page.getByLabel("Full Name *").fill("Dr. Test User");
  await page.getByLabel("Email *").fill("doctor@example.com");
  await page.getByLabel("Facility Name *").fill("Demo Clinic");
  await page
    .getByLabel("Message *")
    .fill("We want to evaluate Docita for appointment and billing workflows.");

  await page
    .locator("form")
    .getByRole("button", { name: "Request setup" })
    .click();

  await expect(page.getByText("Message sent successfully")).toBeVisible({
    timeout: 15000,
  });
  expect(csrfHeader).toBe("e2e-csrf-token");
});

test("contact inquiry form handles failure and reset after success", async ({
  page,
}) => {
  let shouldFail = true;

  await page.route("**/api/v1/contact/inquiry", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    if (shouldFail) {
      shouldFail = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "temporarily unavailable" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: "inquiry_test_002" }),
    });
  });

  await page.goto("/contact");
  await waitForContactFormHydration(page);
  await page.evaluate(() => {
    document.cookie = "XSRF-TOKEN=e2e-csrf-token; path=/";
  });
  await page.getByLabel("Full Name *").fill("Dr. Failure Case");
  await page.getByLabel("Email *").fill("doctor@example.com");
  await page.getByLabel("Facility Name *").fill("Demo Clinic");
  await page
    .getByLabel("Message *")
    .fill("Please help us plan a rollout for two locations.");

  await page
    .locator("form")
    .getByRole("button", { name: "Request setup" })
    .click();

  await expect(
    page.getByText(
      "We could not send your message right now. Please try again in a few minutes.",
    ),
  ).toBeVisible();

  await page
    .locator("form")
    .getByRole("button", { name: "Request setup" })
    .click();

  await expect(page.getByText("Message sent successfully")).toBeVisible();

  await page.getByRole("button", { name: "Send another message" }).click();
  await expect(page.getByLabel("Full Name *")).toHaveValue("");
});
