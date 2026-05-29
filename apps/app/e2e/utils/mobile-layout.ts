import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const MOBILE_VIEWPORT = { width: 390, height: 844 } as const;

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
    page.getByTestId("mobile-command-palette"),
  ).toBeVisible();
  await expect(page.getByTestId("topbar-quick-add")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Search patients, appointments, and prescriptions",
    }),
  ).toBeVisible();
}
