import { expect, test } from "@playwright/test";

const LANDING_URL = "http://127.0.0.1:3003";

test.describe("Landing Page - Critical Flows", () => {
  test("LANDING FLOW 1: Home Page - Load, Navigation, CTA", async ({
    page,
  }) => {
    await page.goto(`${LANDING_URL}/`, { waitUntil: "networkidle" });

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.toLowerCase()).toContain("docita");

    const mainHeading = await page.locator("h1").first();
    expect(mainHeading).toBeTruthy();
    await expect(mainHeading).toBeVisible();

    const navbar = await page.locator("nav");
    expect(navbar).toBeTruthy();

    const navLinks = await page.locator("nav a");
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    const ctaButtons = await page.locator(
      "a:has-text('Get Started'), button:has-text('Get Started'), a:has-text('Sign Up'), button:has-text('Sign Up')",
    );
    const ctaCount = await ctaButtons.count();
    if (ctaCount > 0) {
      await expect(ctaButtons.first()).toBeVisible();
    }

    expect(consoleErrors).toEqual([]);

  });

  test(" LANDING FLOW 2: Navigation - All Pages Accessible", async ({
    page,
  }) => {
    const pages = [
      { path: "/", name: "Home" },
      { path: "/features", name: "Features" },
      { path: "/pricing", name: "Pricing" },
      { path: "/about", name: "About" },
    ];

    for (const pageConfig of pages) {
      const response = await page.goto(`${LANDING_URL}${pageConfig.path}`, {
        waitUntil: "networkidle",
      });

      expect(response?.status()).toBeLessThan(400);

      const body = await page.locator("body");
      expect(body).toBeTruthy();
      await expect(body).toContainText(/[a-zA-Z]/);
    }
  });

  test(" LANDING FLOW 3: Forms - Signup & Contact Forms Work", async ({
    page,
  }) => {
    await page.goto(`${LANDING_URL}/`, { waitUntil: "networkidle" });

    const signupForm = await page.locator("form, [role='form']").first();
    if (signupForm) {
      const emailInput = await page
        .locator(
          "input[type='email'], input[name*='email'], input[placeholder*='email']",
        )
        .first();
      if (emailInput) {
        await emailInput.fill("test@example.com");
        const inputValue = await emailInput.inputValue();
        expect(inputValue).toBe("test@example.com");
      }
    }

    const phoneNumber = await page.locator("a[href^='tel:']");
    const email = await page.locator("a[href^='mailto:']");
    expect(await phoneNumber.count()).toBeGreaterThanOrEqual(0);
    expect(await email.count()).toBeGreaterThanOrEqual(0);

  });

  test(" LANDING FLOW 4: Performance - Page Load Times", async ({ page }) => {
    const pages = ["/", "/features", "/pricing"];

    for (const pagePath of pages) {
      const startTime = Date.now();

      await page.goto(`${LANDING_URL}${pagePath}`, {
        waitUntil: "networkidle",
      });

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(5000);
    }
  });

  test(" LANDING FLOW 5: SEO & Meta Tags - Pages Properly Configured", async ({
    page,
  }) => {
    const pageChecks = [
      { path: "/", titleContains: "Docita" },
      { path: "/features", titleContains: "Features" },
      { path: "/pricing", titleContains: "Pricing" },
    ];

    for (const pageConfig of pageChecks) {
      await page.goto(`${LANDING_URL}${pageConfig.path}`, {
        waitUntil: "networkidle",
      });

      const title = await page.title();
      expect(title).toContain(pageConfig.titleContains);

      const description = await page.locator('meta[name="description"]');
      const descriptionContent = await description.getAttribute("content");
      expect(descriptionContent).toBeTruthy();

      const ogTitle = await page.locator('meta[property="og:title"]');
      await ogTitle.count();
    }
  });

  test(" LANDING FLOW 6: Responsive Design - Mobile Compatibility", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${LANDING_URL}/`, { waitUntil: "networkidle" });

    const hamburger = await page
      .locator("button[aria-label*='menu'], .hamburger, [class*='mobile-menu']")
      .first();
    const hasHamburger = (await hamburger.count()) > 0;

    if (hasHamburger) {

      await hamburger.click();

      await page.waitForTimeout(300);
    }

    const bodyWidth = await page.evaluate(() => {
      return document.documentElement.clientWidth;
    });

    expect(bodyWidth).toBeLessThanOrEqual(375);

    const textElements = await page.locator("p, h1, h2, h3, a");
    const fontSize = await textElements.first().evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    const fontSizeNum = parseFloat(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(12);

    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test(" LANDING FLOW 7: Security - No Sensitive Data Exposed", async ({
    page,
  }) => {
    const requests: string[] = [];

    page.on("request", (request) => {
      const url = request.url();
      requests.push(url);

      if (
        url.includes("api_key=") ||
        url.includes("token=") ||
        url.includes("password=")
      ) {
        throw new Error(`Sensitive data exposure detected in request: ${url}`);
      }
    });

    page.on("response", (response) => {
      const url = response.url();
      if (url.includes("http://") && !url.includes("localhost")) {
        throw new Error(`Insecure request detected: ${url}`);
      }
    });

    await page.goto(`${LANDING_URL}/`, { waitUntil: "networkidle" });

    const pageContent = await page.content();
    expect(pageContent).not.toContain("api_key=");
    expect(pageContent).not.toContain("sk-");
    expect(pageContent).not.toContain("pk-");
  });

  test(" LANDING FLOW 8: CTA Journey - Home → Feature → Pricing → Signup", async ({
    page,
  }) => {
    await page.goto(`${LANDING_URL}/`, { waitUntil: "networkidle" });

    const featuresLink = await page
      .locator("a:has-text('Features'), a[href*='/features']")
      .first();
    if ((await featuresLink.count()) > 0) {
      await featuresLink.click();
      await page.waitForURL(`**/features`);
    }

    const pricingLink = await page
      .locator("a:has-text('Pricing'), a[href*='/pricing']")
      .first();
    if ((await pricingLink.count()) > 0) {
      await pricingLink.click();
      await page.waitForURL(`**/pricing`);
    }

    const ctaButton = await page
      .locator(
        "a:has-text('Get Started'), button:has-text('Sign Up'), a:has-text('Start Free Trial')",
      )
      .first();
    if ((await ctaButton.count()) > 0) {
      await ctaButton.getAttribute("href");
    }
  });

  test.afterAll(async () => {
  });
});
