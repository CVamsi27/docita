import { expect, test } from "@playwright/test";
import { reuseSharedGeneralClinicUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import {
  expectPageHeader,
  expectProtectedWorkspaceLoaded,
} from "./utils/ui-contracts";

test.describe("Patients page (Origin contract)", () => {
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

  test("renders PageHeader title and Add patient primary action", async ({
    page,
  }) => {
    await page.goto("/patients", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
    await expectPageHeader(page, { title: "Patients" });
    await expect(page.getByTestId("patients-add-trigger")).toBeVisible();
  });

  test("opens Add Patient dialog when ?action=new is supplied", async ({
    page,
  }) => {
    await page.goto("/patients?action=new", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
    await expect(
      page.getByRole("dialog").filter({ hasText: /add patient/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test("New patient command palette action navigates with ?action=new", async ({
    page,
  }) => {
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+K" : "Control+K",
    );
    const palette = page.getByRole("dialog").first();
    await expect(palette).toBeVisible();
    await palette.getByPlaceholder(/enter command/i).fill("new patient");
    await page
      .getByRole("option", { name: /new patient/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/patients\?.*action=new/);
  });
});
