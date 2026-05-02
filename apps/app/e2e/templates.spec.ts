import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser } from "./utils/patient-helpers";

test.describe("Templates hub", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  test("renders the templates page header and category tabs", async ({
    page,
  }) => {
    await page.goto("/templates", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/templates/);
    await expect(
      page.getByRole("heading", { name: "Templates" }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Note templates/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Prescription templates/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Message templates/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Consent forms/i }),
    ).toBeVisible();
  });

  test("syncs the active tab to the URL", async ({ page }) => {
    await page.goto("/templates", { waitUntil: "networkidle" });

    await page.getByRole("tab", { name: /Message templates/i }).click();
    await expect(page).toHaveURL(/tab=messages/);
  });
});
