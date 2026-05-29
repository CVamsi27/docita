import { expect, test } from "@playwright/test";

const VIEWPORT_PRESETS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
} as const;

const LANDING_SECTIONS = [
  { path: "/", name: "Home" },
  { path: "/#pricing", name: "Pricing" },
] as const;

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
}

for (const preset of ["mobile", "tablet"] as const) {
  test.describe(`Landing responsive (${preset})`, () => {
    test.use({ viewport: VIEWPORT_PRESETS[preset] });

    for (const section of LANDING_SECTIONS) {
      test(`${section.name} has no horizontal overflow`, async ({ page }) => {
        await page.goto(section.path, { waitUntil: "domcontentloaded" });
        await expectNoHorizontalOverflow(page);
        await expect(page.locator("main")).toBeVisible();
      });
    }
  });
}
