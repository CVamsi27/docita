import { expect, test } from "@playwright/test";
import { setupTestUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import { expectPageHeader, expectRoute } from "./utils/ui-contracts";

test.describe("Dashboard", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
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
    await page.goto("/dashboard", { waitUntil: "networkidle" });
  });

  test("should load dashboard with all sections", async ({ page }) => {
    await expectRoute(page, /\/dashboard/);
    await expectPageHeader(page, { title: /Good (morning|afternoon|evening)/i });

    // Navigation contract: sidebar key items should exist.
    await expect(page.getByRole("link", { name: "Patients", exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Appointments", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Consultation", exact: true }),
    ).toBeVisible();
  });

  test("should navigate to patients page from sidebar", async ({ page }) => {
    await page.getByRole("link", { name: "Patients", exact: true }).click();
    await expect(page).toHaveURL(/\/patients/);
  });
});
