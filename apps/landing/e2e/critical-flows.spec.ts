import { expect, type Page, test } from "@playwright/test";

async function seedCsrfCookie(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "XSRF-TOKEN",
      value: "e2e-csrf-token",
      url: new URL("/", page.url()).origin,
    },
  ]);
  await expect
    .poll(() => page.evaluate(() => document.cookie))
    .toContain("XSRF-TOKEN=e2e-csrf-token");
}

test("homepage renders primary CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "A calmer clinic day.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start clinic setup" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Book a demo" }).first(),
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
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("button", { name: "Request setup" }),
  ).toBeVisible();
  await seedCsrfCookie(page);

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
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("button", { name: "Request setup" }),
  ).toBeVisible();
  await seedCsrfCookie(page);
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

test("homepage links to product and pricing while retaining setup and demo destinations", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(
    page.getByRole("heading", { name: "Check in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Consult", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Close the visit", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Illustrative demo workspace · Sample data"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start clinic setup", exact: true }).last(),
  ).toHaveAttribute("href", /\/onboarding$/);
  await expect(
    page.getByRole("link", { name: "Book a demo", exact: true }).first(),
  ).toHaveAttribute("href", "/contact");
  await page
    .getByRole("link", { name: "Book a demo", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(
    page.getByRole("heading", { name: "Contact us", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Product", exact: true })
    .click();
  await expect(page).toHaveURL(/\/product$/);
  await expect(page.locator("#product-screenshots")).toBeAttached();
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Pricing", exact: true })
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(
    page.getByRole("heading", { name: /Plans for every practice size/ }),
  ).toBeVisible();
});

test("homepage respects a saved dark theme and reflows at phone width", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("docita-theme", "dark"));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A calmer clinic day.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("homepage content and destinations work without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(new URL("/", baseURL ?? "http://127.0.0.1:3003").toString());
  await expect(
    page.getByRole("heading", { name: "A calmer clinic day." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View pricing" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(
    page.getByRole("heading", { name: /Plans for every practice size/ }),
  ).toBeVisible();
  await context.close();
});

test("former homepage bookmarks still reach the detailed product section", async ({
  page,
}) => {
  await page.goto("/#product-screenshots");
  await expect(page).toHaveURL(/\/product#product-screenshots$/);
  await expect(page.locator("#product-screenshots")).toBeVisible();
});

test("homepage theme toggle remains usable when browser storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
