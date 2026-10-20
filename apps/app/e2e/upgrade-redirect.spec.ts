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

  test("renders the upgrade page with plan options", async ({ page }) => {
    await page.goto("/upgrade", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/upgrade/);
    await expect(
      page.getByRole("heading", { name: /Upgrade your plan/i }),
    ).toBeVisible();
    await expect(page.getByText("Starter", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Professional", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Enterprise", { exact: true }),
    ).toBeVisible();
  });
});
