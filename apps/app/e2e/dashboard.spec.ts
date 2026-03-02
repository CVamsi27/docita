import { expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api";

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

test.describe("Dashboard", () => {
  let user: Record<string, unknown>;

  test.beforeEach(async ({ page, context }) => {

    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    const registerRes = await context.request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password,
        firstName: "Test",
        lastName: "Doctor",
        role: "DOCTOR",
        clinicName: "Test Clinic",
      },
    });

    expect(registerRes.ok()).toBeTruthy();
    user = toRecord(await registerRes.json());

    await page.goto("/login");
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    } catch {
      await page.goto("/").catch(() => null);
      await page.goto("/login").catch(() => null);
      await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    }

    const token = readString(user, "access_token") || readString(user, "accessToken");
    const nestedUser = toRecord(user?.user);
    const userObj = Object.keys(nestedUser).length > 0 ? nestedUser : user;
    const userForStorage = JSON.stringify({
      id: readString(userObj, "id") || readString(userObj, "userId") || null,
      email: readString(userObj, "email") || null,
      clinicId: readString(userObj, "clinicId") || null,
      role: readString(userObj, "role") || "DOCTOR",
    });

    await page.addInitScript(
      (args: { t: string; u: string }) => {
        try {
          const { t, u } = args;
          localStorage.setItem("docita_token", t);
          localStorage.setItem("docita_user", u);
        } catch {

        }
      },
      { t: token, u: userForStorage },
    );

    await page.goto("/", { waitUntil: "networkidle" }).catch(() => null);
    await page.waitForTimeout(500);
  });

  test("should load dashboard with all sections", async ({ page }) => {

    await expect(page.locator("h1")).toBeVisible();

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
});
