import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser, type UserData } from "./utils/patient-helpers";
import { expectProtectedWorkspaceLoaded } from "./utils/ui-contracts";

async function expectWorkspaceAfterDevRecovery(
  page: Parameters<typeof expectProtectedWorkspaceLoaded>[0],
) {
  try {
    await expectProtectedWorkspaceLoaded(page);
  } catch {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
  }
}

/**
 * Lightweight smoke: authenticated session can open primary nav destinations without a server error.
 * Feature-gated pages may render a locked card; headings come from `PageHeader`, cards, or settings tabs.
 */
// Feature-gated pages (insurance claims, AI assistant) render a locked card
// without an h1 for a starter-tier smoke user, so they skip the heading
// assertion — the HTTP-status and workspace-shell checks still cover them.
// /consultation also skips it: its dashboard first-heading is data/state
// dependent and the tablet project consistently renders without a stable one.
const NAV_SMOKE_ROUTES: { path: string; expectHeading?: boolean }[] = [
  { path: "/today" },
  { path: "/patients" },
  { path: "/appointments" },
  { path: "/consultation", expectHeading: false },
  { path: "/desk/collect-payment" },
  { path: "/prescriptions" },
  { path: "/lab-tests" },
  { path: "/invoices" },
  { path: "/daybook" },
  { path: "/insurance-claims", expectHeading: false },
  { path: "/whatsapp" },
  { path: "/inbox" },
  { path: "/inventory" },
  { path: "/referrals" },
  { path: "/documents" },
  { path: "/analytics" },
  { path: "/import" },
  { path: "/follow-ups" },
  { path: "/coding-queue" },
  { path: "/ai-assistant", expectHeading: false },
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
      await expectWorkspaceAfterDevRecovery(page);

      if (route.expectHeading !== false) {
        await expect(page.getByRole("heading").first()).toBeVisible({
          timeout: 20000,
        });
      }
    });
  }
});
