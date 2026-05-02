import { expect, test } from "@playwright/test";

test.describe("Join clinic onboarding page", () => {
  test("redirects unauthenticated visitors to login with join-clinic next", async ({
    page,
  }) => {
    await page.goto("/join-clinic", { waitUntil: "networkidle" });

    await expect(page).toHaveURL(/\/login\?next=%2Fjoin-clinic/);
  });
});
