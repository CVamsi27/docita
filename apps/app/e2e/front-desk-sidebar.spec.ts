import { expect, test } from "@playwright/test";
import { reuseSharedFrontDeskClinicUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import { expectProtectedWorkspaceLoaded } from "./utils/ui-contracts";

test.describe("Front desk workspace sidebar", () => {
  let user: Awaited<ReturnType<typeof reuseSharedFrontDeskClinicUser>> | null =
    null;

  test.beforeAll(async ({ request }) => {
    user = await reuseSharedFrontDeskClinicUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await seedSession(page, {
      token: user.accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: "ADMIN",
        clinicId: user.clinicId,
      },
    });
  });

  test("hides Consultation for front desk clinic", async ({ page }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(
      primaryNav.getByRole("link", { name: "Consultation", exact: true }),
    ).toHaveCount(0);
  });

  test("keeps Appointments visible for front desk clinic", async ({ page }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);

    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    const appointmentsLink = primaryNav.getByTestId("sidebar-link-appointments");
    await expect(appointmentsLink).toBeVisible();
    await expect(appointmentsLink).toHaveAccessibleName("Appointments");
  });
});
