import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser } from "./utils/patient-helpers";

test.describe("Help center", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  test("renders the help page header from the new /help route", async ({
    page,
  }) => {
    await page.goto("/help", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/help/);
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter topic/i)).toBeVisible();
  });
});
