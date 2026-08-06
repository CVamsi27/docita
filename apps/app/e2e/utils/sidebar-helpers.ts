import { expect, type Page } from "@playwright/test";

function sidebarNavLinkTestId(href: string): string {
  const slug = href.replace(/^\//, "").replace(/\//g, "-");
  return `sidebar-link-${slug}`;
}

/** Opens the mobile navigation sheet when the desktop sidebar is hidden. */
async function openMobileNavigationIfNeeded(page: Page) {
  const openNav = page.getByRole("button", { name: "Open navigation" });
  if (await openNav.isVisible().catch(() => false)) {
    await openNav.click();
    await expect(
      page.getByRole("navigation", { name: "Primary" }),
    ).toBeVisible();
  }
}

/** Expands the desktop sidebar rail when labels are collapsed to icons only. */
async function expandSidebarIfCollapsed(page: Page) {
  const expandSidebar = page.getByRole("button", { name: "Expand sidebar" });
  if (await expandSidebar.isVisible().catch(() => false)) {
    await expandSidebar.click();
  }
}

/** Ensures primary sidebar nav is reachable (mobile sheet or expanded desktop rail). */
export async function ensurePrimarySidebarAccessible(page: Page) {
  await openMobileNavigationIfNeeded(page);
  await expandSidebarIfCollapsed(page);
}

/** Asserts a primary sidebar nav link is present (icon rail or expanded labels). */
export async function expectPrimarySidebarLinkVisible(
  page: Page,
  href: string,
  label: string,
) {
  await ensurePrimarySidebarAccessible(page);

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
