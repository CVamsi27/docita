import { expect, test } from "@playwright/test";
import { loginUser, setupTestUser } from "./utils/patient-helpers";

test.describe("Inbox hub", () => {
  let user: Awaited<ReturnType<typeof setupTestUser>> | null = null;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  test("renders the unified inbox page header and tabs", async ({ page }) => {
    await page.goto("/inbox", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Messages/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Follow-ups/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Join requests/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Coding queue/i }),
    ).toBeVisible();
  });

  test("syncs the active tab to the URL", async ({ page }) => {
    await page.goto("/inbox", { waitUntil: "networkidle" });

    await page.getByRole("tab", { name: /Follow-ups/i }).click();
    await expect(page).toHaveURL(/tab=follow-ups/);
  });
});
