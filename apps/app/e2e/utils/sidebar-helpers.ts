import { expect, type Page } from "@playwright/test";

function sidebarNavLinkTestId(href: string): string {
  const slug = href.replace(/^\//, "").replace(/\//g, "-");
  return `sidebar-link-${slug}`;
}

/** Expands the desktop sidebar rail when labels are collapsed to icons only. */
export async function expandSidebarIfCollapsed(page: Page) {
  const expandSidebar = page.getByRole("button", { name: "Expand sidebar" });
  if (await expandSidebar.isVisible().catch(() => false)) {
    await expandSidebar.click();
  }
}

/**
 * Opens the mobile navigation drawer when the desktop sidebar rail is hidden
 * (viewports below the `md` breakpoint, e.g. mobile-chrome). On wider viewports
 * the "Open navigation" trigger is `md:hidden`, so this is a no-op.
 */
export async function openMobileNavIfPresent(page: Page) {
  const openNav = page.getByRole("button", { name: "Open navigation" });
  if (await openNav.isVisible().catch(() => false)) {
    await openNav.click();
    await page
      .getByRole("navigation", { name: "Primary" })
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => undefined);
  }
}

/** Asserts a primary sidebar nav link is present (icon rail or expanded labels). */
export async function expectPrimarySidebarLinkVisible(
  page: Page,
  href: string,
  label: string,
) {
  await openMobileNavIfPresent(page);
  await expandSidebarIfCollapsed(page);

  const primaryNav = page.getByRole("navigation", { name: "Primary" });
  const testIdLink = primaryNav.getByTestId(sidebarNavLinkTestId(href));
  const roleLink = primaryNav.getByRole("link", { name: label, exact: true });

  const testIdVisible = await testIdLink
    .isVisible({ timeout: 5000 })
    .catch(() => false);
  if (testIdVisible) {
    await expect(testIdLink).toBeVisible();
    await expect(testIdLink).toHaveAccessibleName(label);
    return;
  }

  await expect(roleLink).toBeVisible();
}
