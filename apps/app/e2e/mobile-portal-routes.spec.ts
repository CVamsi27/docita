import { test } from "@playwright/test";
import { PORTAL_MOBILE_ROUTES } from "./mobile-route-matrix";
import { expectNoHorizontalOverflow } from "./utils/mobile-layout";
import {
  createPortalPatientPhone,
  expectPortalShellLoaded,
  loginPortalPatient,
} from "./utils/portal-helpers";

test.describe("Mobile patient portal — public", () => {
  test("portal login page has no horizontal overflow", async ({ page }) => {
    await page.goto("/portal/login", { waitUntil: "domcontentloaded" });
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("Mobile patient portal — authenticated", () => {
  let portalPhone: string | null = null;
  let portalReady = false;

  test.beforeAll(async ({ request }) => {
    portalPhone = await createPortalPatientPhone(request);
    portalReady = Boolean(portalPhone);
  });

  test.beforeEach(async ({ page }, testInfo) => {
    if (!portalReady || !portalPhone) {
      testInfo.skip(true, "Portal patient bootstrap unavailable");
      return;
    }
    const loggedIn = await loginPortalPatient(page, portalPhone);
    if (!loggedIn) {
      testInfo.skip(true, "Portal OTP login unavailable (DATABASE_URL)");
    }
  });

  for (const route of PORTAL_MOBILE_ROUTES) {
    test(`no horizontal overflow on ${route.label} (${route.path})`, async ({
      page,
    }) => {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await expectPortalShellLoaded(page);
      await expectNoHorizontalOverflow(page);
    });
  }
});
