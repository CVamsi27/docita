import { expect, test } from "@playwright/test";

type DeviceConfig = {
  name: string;
  viewport: { width: number; height: number };
};

const DEVICES: DeviceConfig[] = [
  { name: "iPhone 13", viewport: { width: 375, height: 812 } },
  { name: "iPad", viewport: { width: 768, height: 1024 } },
  { name: "Android", viewport: { width: 412, height: 915 } },
];

for (const device of DEVICES) {
  test.describe(`Mobile form checks - ${device.name}`, () => {
    test.use({
      viewport: device.viewport,
      hasTouch: true,
      isMobile: true,
    });

    test(`login form renders without horizontal scroll and keeps focused input visible`, async ({
      page,
    }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalOverflow).toBe(false);

      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.click();

      const box = await emailInput.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(device.viewport.height);
    });

    test(`login page touch targets are at least 48x48`, async ({ page }) => {
      await page.goto("/login", { waitUntil: "networkidle" });

      const violations = await page.evaluate(() => {
        const MIN_TARGET_SIZE = 48;
        const forms = Array.from(document.querySelectorAll("form"));
        const selector =
          'button, [role="button"], input:not([type="hidden"]), select, textarea, a[href]';

        const isVisible = (element: Element) => {
          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.width > 0 &&
            rect.height > 0
          );
        };

        return forms
          .flatMap((form) => Array.from(form.querySelectorAll(selector)))
          .filter((element) => isVisible(element))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const text = element.textContent?.trim() || "";
            const label =
              element.getAttribute("aria-label") ||
              element.getAttribute("name") ||
              element.getAttribute("id") ||
              text ||
              element.tagName.toLowerCase();

            return {
              tag: element.tagName.toLowerCase(),
              label: label.slice(0, 80),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          })
          .filter(
            (target) =>
              target.width < MIN_TARGET_SIZE || target.height < MIN_TARGET_SIZE
          );
      });

      expect(violations).toEqual([]);
    });
  });
}