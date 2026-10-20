import { expect, test } from "@playwright/test";
import {
  loginUser,
  reuseSharedGeneralClinicUser,
} from "./utils/patient-helpers";
import {
  expectPageHeader,
  expectProtectedWorkspaceLoaded,
  expectRoute,
} from "./utils/ui-contracts";

test.describe("Dashboard redirect", () => {
  // Both tests assert desktop layout (page-header copy and the sectioned
  // sidebar are hidden or restructured below the lg breakpoint).
  test.skip(
    ({ viewport }) => !viewport || viewport.width < 1024,
    "desktop layout assertions",
  );

  let user: Awaited<ReturnType<typeof reuseSharedGeneralClinicUser>> | null =
    null;

  test.beforeAll(async ({ request }) => {
    user = await reuseSharedGeneralClinicUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  test("redirects /dashboard to /today (canonical morning landing)", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
    await expectRoute(page, /\/today/);
    await expectPageHeader(page, { title: "Today" });
  });

  test("renders the Origin sectioned sidebar with TRACK and SERVICES", async ({
    page,
  }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
    const sidebar = page.getByRole("complementary").first();
    await expect(sidebar.getByText("Track", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Services", { exact: true })).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Patients", exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Appointments", exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Consultation", exact: true }),
    ).toBeVisible();
  });
});
