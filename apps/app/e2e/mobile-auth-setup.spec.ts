import { expect, test } from "@playwright/test";
import { AUTH_SETUP_MOBILE_ROUTES } from "./mobile-route-matrix";
import { expectNoHorizontalOverflow } from "./utils/mobile-layout";

test.describe("Mobile auth and setup shells", () => {
  for (const route of AUTH_SETUP_MOBILE_ROUTES) {
    test(`no horizontal overflow on ${route.label} (${route.path})`, async ({
      page,
    }) => {
      test.skip(
        Boolean(route.skipInCi) && Boolean(process.env.CI),
        `${route.path} requires tokens or authenticated setup state`,
      );

      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible({ timeout: 30000 });
      await expectNoHorizontalOverflow(page);
    });
  }

  test("login primary action meets minimum touch target", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const submit = page.getByRole("button", { name: /sign in|log in/i }).first();
    await expect(submit).toBeVisible();
    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
