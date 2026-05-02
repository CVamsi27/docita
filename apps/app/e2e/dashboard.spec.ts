import { expect, test } from "@playwright/test";
import { reuseSharedGeneralClinicUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import {
  expectPageHeader,
  expectProtectedWorkspaceLoaded,
  expectRoute,
} from "./utils/ui-contracts";

test.describe("Dashboard redirect", () => {
  let user: Awaited<ReturnType<typeof reuseSharedGeneralClinicUser>> | null =
    null;

  test.beforeAll(async ({ request }) => {
    user = await reuseSharedGeneralClinicUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await seedSession(page, {
      token: user.accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: "ADMIN_DOCTOR",
        clinicId: user.clinicId,
      },
    });
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
