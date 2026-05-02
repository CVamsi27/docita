import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser } from "./utils/patient-helpers";

test.describe("Upgrade route", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  test("redirects /upgrade to the subscription tab in settings", async ({
    page,
  }) => {
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/settings\?tab=subscription/);
  });
});
