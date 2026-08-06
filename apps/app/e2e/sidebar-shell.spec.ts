import { expect, test } from "@playwright/test";
import { reuseSharedGeneralClinicUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
import { expectProtectedWorkspaceLoaded } from "./utils/ui-contracts";

test.describe("Origin-inspired sidebar + Ask AI", () => {
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
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
  });

  test("renders TRACK and SERVICES sections in the sidebar", async ({ page }) => {
    const sidebar = page.getByRole("complementary").first();
    await expect(sidebar.getByText("Track", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Services", { exact: true })).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Patients", exact: true }),
    ).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Invoices", exact: true }),
    ).toBeVisible();
  });

  test("opens the Ask AI overlay from the pinned sidebar trigger", async ({
    page,
  }) => {
    const trigger = page.getByTestId("ask-ai-trigger").first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(
      page.getByRole("dialog", { name: /ask ai/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /ask ai prompt/i }),
    ).toBeVisible();
  });

  test("opens the Ask AI overlay from the topbar action", async ({ page }) => {
    const trigger = page.getByTestId("topbar-ask-ai");
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(
      page.getByRole("dialog", { name: /ask ai/i }),
    ).toBeVisible();
  });

  test("topbar quick-add reveals an explicit four-action popover", async ({
    page,
  }) => {
    const trigger = page.getByTestId("topbar-quick-add");
    await expect(trigger).toBeVisible();
    await trigger.click();
    const popover = page.getByTestId("quick-add-popover");
    await expect(popover).toBeVisible();
    await expect(popover.getByTestId("quick-add-new-patient")).toBeVisible();
    await expect(
      popover.getByTestId("quick-add-new-appointment"),
    ).toBeVisible();
    await expect(popover.getByTestId("quick-add-new-invoice")).toBeVisible();
    await expect(
      popover.getByTestId("quick-add-start-consultation"),
    ).toBeVisible();
  });

  test("quick-add new patient routes to /patients?action=new", async ({
    page,
  }) => {
    await page.getByTestId("topbar-quick-add").click();
    await page.getByTestId("quick-add-new-patient").click();
    await expect(page).toHaveURL(/\/patients\?action=new$/);
  });
});
