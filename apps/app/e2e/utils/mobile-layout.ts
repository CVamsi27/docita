import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { MOBILE_VIEWPORT, VIEWPORT_PRESETS } from "./viewport-presets";

export { MOBILE_VIEWPORT, VIEWPORT_PRESETS };

export async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasOverflow).toBe(false);
}

export async function expectMobileWorkspaceChrome(page: Page) {
  const mobileHeader = page.getByTestId("mobile-header");
  await expect(mobileHeader).toBeVisible();
  await expect(
    mobileHeader.getByTestId("mobile-command-palette"),
  ).toBeVisible();
  await expect(mobileHeader.getByTestId("topbar-quick-add")).toBeVisible();
  await expect(
    mobileHeader.getByRole("button", {
      name: "Search patients, appointments, and prescriptions",
    }),
  ).toBeVisible();
}
