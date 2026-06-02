import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser, UserData } from "./utils/patient-helpers";

/**
 * Lightweight smoke: authenticated session can open primary nav destinations without a server error.
 * Feature-gated pages may render a locked card; headings come from `PageHeader`, cards, or settings tabs.
 */
const NAV_SMOKE_ROUTES: { path: string }[] = [
  { path: "/today" },
  { path: "/patients" },
  { path: "/appointments" },
  { path: "/consultation" },
  { path: "/desk/collect-payment" },
  { path: "/prescriptions" },
  { path: "/lab-tests" },
  { path: "/invoices" },
  { path: "/daybook" },
  { path: "/insurance-claims" },
  { path: "/whatsapp" },
  { path: "/inbox" },
  { path: "/inventory" },
  { path: "/vaccines" },
  { path: "/referrals" },
  { path: "/documents" },
  { path: "/analytics" },
  { path: "/import" },
  { path: "/follow-ups" },
  { path: "/coding-queue" },
  { path: "/ai-assistant" },
  { path: "/specialty/dental-charts" },
  { path: "/hospital/beds" },
  { path: "/billing-locked" },
  { path: "/upgrade" },
  { path: "/settings" },
  { path: "/help" },
];

test.describe("Nav routes smoke", () => {
  let user: UserData;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, user);
  });

  for (const route of NAV_SMOKE_ROUTES) {
    test(`should load ${route.path}`, async ({ page }) => {
      const response = await page.goto(route.path, {
        waitUntil: "networkidle",
      });

      expect(response?.status(), `${route.path} HTTP status`).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible({ timeout: 30000 });

      if (route.path === "/upgrade") {
        await expect(page).toHaveURL(/\/settings/);
      }

      await expect(page.getByRole("heading").first()).toBeVisible({
        timeout: 20000,
      });
    });
  }
});
