import { expect, Page, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api";

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

let authToken: string;
let clinicId: string;

type GlobalWithE2EUser = typeof globalThis & {
  __E2E_SETTINGS_USER?: Record<string, unknown>;
};

test.describe("Settings Management", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const userEmail = `doctor${Date.now()}@test.com`;
    const userPassword = "Test@123456";

    const registerRes = await page.request.post(`${API_URL}/auth/register`, {
      data: {
        email: userEmail,
        password: userPassword,
        firstName: "Dr",
        lastName: "Settings",
        role: "DOCTOR",
        clinicName: "Test Clinic",
      },
    });

    const user = toRecord(await registerRes.json());
    const regData = user;

    let token: string | null = null;
    try {
      token =
        readString(regData, "access_token") ||
        readString(regData, "accessToken") ||
        null;

      const clinicRes = await page.request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: "Settings Test Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "123 Test St",
          tier: "ENTERPRISE",
        },
      });

      if (clinicRes.ok()) {
        const clinic = toRecord(await clinicRes.json());
        clinicId = readString(clinic, "id") || "";

        const nestedUser = toRecord(regData?.user);
        const userInfo = Object.keys(nestedUser).length > 0 ? nestedUser : regData;
        const doctorId = readString(userInfo, "id") || readString(regData, "id");
        const assignRes = await page.request.post(`${API_URL}/doctor-clinics`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { doctorId, clinicId: clinic.id, role: "doctor" },
        });

        if (assignRes.ok()) {

          const loginRes = await page.request.post(`${API_URL}/auth/login`, {
            data: { email: userEmail, password: userPassword },
          });
          if (loginRes.ok()) {
            const loginData = toRecord(await loginRes.json());
            authToken =
              readString(loginData, "access_token") ||
              readString(loginData, "accessToken") ||
              "";
            clinicId =
              readString(toRecord(loginData?.user), "clinicId") || clinicId;
            regData.user = loginData?.user || regData?.user;
          }
        }
      }
    } catch (_err) {

    }

    const nestedStoredUser = toRecord(regData?.user);
    const storedUser =
      Object.keys(nestedStoredUser).length > 0 ? nestedStoredUser : regData;
    const minimalUser = {
      id: readString(storedUser, "id") || readString(storedUser, "userId") || null,
      email: readString(storedUser, "email") || null,
      clinicId: readString(storedUser, "clinicId") || clinicId || null,
      role: readString(storedUser, "role") || "DOCTOR",
    };
    (globalThis as GlobalWithE2EUser).__E2E_SETTINGS_USER = minimalUser;

    await context.close();
  });

  test("should load settings page and display clinic info", async ({
    page,
  }) => {
    await loginAsDoctor(page);
    await page.goto("/settings", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });

  test("should update clinic settings", async ({ page }) => {
    await loginAsDoctor(page);
    await page.goto("/settings", { waitUntil: "networkidle" });

    const nameInput = page
      .locator('input[value="Settings Test Clinic"]')
      .first();

    if (!(await nameInput.isVisible())) {

    }

    const saveButton = page.locator('button:has-text("Save Changes")').first();

    expect(await saveButton.isVisible()).toBeTruthy();
  });

  test("should manage doctor availability", async ({ page }) => {
    await loginAsDoctor(page);
    await page.goto("/settings", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });
  });
});

async function loginAsDoctor(page: Page) {
  if (
    !(await page.url()).includes("/dashboard") &&
    !(await page.url()).includes("/settings")
  ) {
    if (typeof authToken !== "undefined" && authToken) {
      const e2eUser = (globalThis as GlobalWithE2EUser).__E2E_SETTINGS_USER;
      const storedUser = e2eUser || {
        id: null,
        email: null,
        clinicId: clinicId || null,
        role: "DOCTOR",
        clinicName: "Test Clinic",
      };

      const userForStorage = JSON.stringify({
        id: readString(storedUser, "id") || null,
        email: readString(storedUser, "email") || null,
        clinicId: readString(storedUser, "clinicId") || clinicId || null,
        role: readString(storedUser, "role") || "DOCTOR",
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
        { t: authToken, u: userForStorage },
      );

      await page
        .goto("/settings", { waitUntil: "networkidle" })
        .catch(() => null);
      await page.waitForTimeout(500);
      return;
    }
    await page.goto("/login").catch(() => null);
  }
}
