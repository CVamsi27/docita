import { expect, test } from "@playwright/test";
import { setupTestUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import {
  expectDashboardQueueSectionReady,
  expectPageHeader,
  expectProtectedWorkspaceLoaded,
  expectRoute,
  isDashboardQueueSectionVisible,
} from "./utils/ui-contracts";

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
    await expectProtectedWorkspaceLoaded(page);
  });

  test("should load dashboard with all sections", async ({ page }) => {
    await expectRoute(page, /\/dashboard/);
    await expectPageHeader(page, { title: /Good (morning|afternoon|evening)/i });
    await expectDashboardQueueSectionReady(page);
    if (await isDashboardQueueSectionVisible(page)) {
      await expect(
        page.getByRole("heading", { name: "Today's queue" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Overview" }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("Welcome to Docita", { exact: true }),
      ).toBeVisible();
    }

    const sidebar = page.getByRole("complementary");
    // Navigation contract: sidebar key items should exist.
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

  test("should navigate to patients page from sidebar", async ({ page }) => {
    await expectDashboardQueueSectionReady(page);
    const patients = page
      .getByRole("complementary")
      .getByRole("link", { name: "Patients", exact: true });
    await Promise.all([
      page.waitForURL(/\/patients/, { timeout: 30000 }),
      patients.click(),
    ]);
  });
});
