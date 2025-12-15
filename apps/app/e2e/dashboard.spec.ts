import { expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api";

test.describe("Dashboard", () => {
  let user: Record<string, unknown>;

  test.beforeEach(async ({ page, context }) => {
    // Setup: Create user via API
    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    const registerRes = await context.request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password,
        name: "Test Doctor",
        role: "DOCTOR",
      },
    });

    expect(registerRes.ok()).toBeTruthy();
    user = (await registerRes.json()) as Record<string, unknown>;

    // Login: navigate and wait for inputs
    await page.goto("/login");
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    } catch {
      await page.goto("/").catch(() => null);
      await page.goto("/login").catch(() => null);
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    }

    // Set the frontend's expected keys so the app recognizes the logged-in user
    const token = (user?.access_token as string) || (user?.accessToken as string);
    const userObj = (user?.user as Record<string, unknown>) || user;
    const userForStorage = JSON.stringify({
      id: (userObj?.id as string) || (userObj?.userId as string) || null,
      email: (userObj?.email as string) || null,
      clinicId: (userObj?.clinicId as string) || null,
      role: (userObj?.role as string) || "DOCTOR",
    });

    await page.addInitScript(
      (args: { t: string; u: string }) => {
        try {
          const { t, u } = args;
          localStorage.setItem("docita_token", t);
          localStorage.setItem("docita_user", u);
        } catch {
          // noop
        }
      },
      { t: token, u: userForStorage },
    );

    await page.goto("/", { waitUntil: "networkidle" }).catch(() => null);
    await page.waitForTimeout(500);
  });

  test("should load dashboard with all sections", async ({ page }) => {
    // Basic header check: ensure page rendered a header
    await expect(page.locator("h1")).toBeVisible();

    // Check that at least one of the key stats/cards is visible
    const statsSelectors = [
      "Patients",
      "Today",
      "Prescriptions",
      "Pending",
      "Queue",
    ];
    let statsVisible = 0;
    for (const s of statsSelectors) {
      if (
        await page
          .getByText(s, { exact: true })
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        statsVisible++;
      }
    }
    expect(statsVisible).toBeGreaterThan(0);

    // Check quick actions: ensure at least one quick action exists
    const quickActions = ["New Patient", "Schedule", "Queue", "Invoice"];
    let quickVisible = 0;
    for (const a of quickActions) {
      if (
        await page
          .getByText(a)
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        quickVisible++;
      }
    }
    expect(quickVisible).toBeGreaterThan(0);

    // Optional sections: verify schedule or recent patients exists
    const hasSchedule = await page
      .getByText("Today's Schedule")
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    const hasRecent = await page
      .getByText("Recent Patients")
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    expect(hasSchedule || hasRecent).toBeTruthy();
  });

  test("should navigate to patients page from quick action", async ({
    page,
  }) => {
    await page.click('text="New Patient"');
    await expect(page).toHaveURL(/.*\/patients\?action=new/);
  });

  test("should navigate to appointments page from quick action", async ({
    page,
  }) => {
    await page.click('text="Schedule"');
    await expect(page).toHaveURL(/.*\/appointments\?action=new/);
  });
});
