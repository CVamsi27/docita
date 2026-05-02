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

test.describe("Today workspace", () => {
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
    await page.goto("/today", { waitUntil: "networkidle" });
    await expectProtectedWorkspaceLoaded(page);
  });

  test("should load today workspace with header and queue band", async ({
    page,
  }) => {
    await expectRoute(page, /\/today/);
    await expectPageHeader(page, { title: "Today" });
    await expectDashboardQueueSectionReady(page);
    await expect(
      page.getByRole("button", { name: "Refresh data" }),
    ).toBeVisible();
    if (await isDashboardQueueSectionVisible(page)) {
      await expect(
        page.getByRole("heading", { name: "Today's queue" }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByText("Start with your first patient", { exact: true }),
      ).toBeVisible();
    }
  });
});
