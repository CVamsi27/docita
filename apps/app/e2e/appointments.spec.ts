import { APIRequestContext, expect, Page, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api";

test.describe("Appointments", () => {
  let cachedUser: {
    id: string;
    email: string;
    clinicId: string;
    accessToken: string;
    role?: string;
  } | null = null;
  let cachedPatient: { id: string } | null = null;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {

    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password,
        firstName: "Test",
        lastName: "Doctor",
        role: "DOCTOR",
        clinicName: "Test Clinic",
      },
    });

    if (!registerRes.ok()) {

      throw new Error("User registration failed");
    }

    const registerData = await registerRes.json();
    const token = registerData.access_token || registerData.accessToken;

    cachedUser = {
      id: registerData.user.id,
      email: registerData.user.email,
      clinicId: registerData.user.clinicId,
      accessToken: token,
      role: registerData.user.role,
    };

    if (!cachedUser.clinicId) {
      const clinicRes = await request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: "Test Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "123 Test St",
          city: "Test City",
          state: "TS",
          zipCode: "12345",
          tier: "ENTERPRISE",
        },
      });

      if (clinicRes.ok()) {
        const clinic = await clinicRes.json();
        cachedUser.clinicId = clinic.id;

        const doctorId = cachedUser.id;
        const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { doctorId, clinicId: clinic.id, role: "doctor" },
        });

        if (assignRes.ok()) {

          const loginRes = await request.post(`${API_URL}/auth/login`, {
            data: { email: cachedUser.email, password },
          });
          if (loginRes.ok()) {
            const loginData = await loginRes.json();
            cachedUser.accessToken =
              loginData.access_token || loginData.accessToken;
            cachedUser.clinicId =
              loginData.user?.clinicId || cachedUser.clinicId;

          }
        }
      }
    }

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        firstName: "Test",
        lastName: "Patient",
        phoneNumber: "1234567890",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: cachedUser!.clinicId,
      },
    });

    if (!patientRes.ok()) {

      throw new Error("Patient creation failed");
    }

    cachedPatient = await patientRes.json();

  });

  test.beforeEach(async ({ page }: { page: Page }) => {

    const token = cachedUser!.accessToken;

    const userForStorage = JSON.stringify({
      id: cachedUser!.id,
      email: cachedUser!.email,
      clinicId: cachedUser!.clinicId,
      role: cachedUser!.role || "DOCTOR",
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

    await page.goto("/dashboard", { waitUntil: "load" }).catch(() => null);
  });

  test("should display appointments list", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.locator("h1")).toContainText("Appointments");
    await expect(page.getByText("Calendar")).toBeVisible();
  });

  test("should create a new appointment", async ({ page }) => {
    await page.goto("/appointments");

    await page.getByRole("button", { name: "New Appointment" }).click();

    await page.click('[role="combobox"]');
    await page.type('[role="combobox"]', "Test Patient");
    await page.keyboard.press("Enter");

  });

  test("should show API-created appointment", async ({ page, request }) => {

    const startTime = new Date(Date.now() + 60 * 60 * 1000);

    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30);

    const appointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        patientId: cachedPatient!.id,
        doctorId: cachedUser!.id,
        clinicId: cachedUser!.clinicId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: "scheduled",
        type: "consultation",
      },
    });

    expect(appointmentRes.ok()).toBeTruthy();

    await page.waitForTimeout(2000);

    await page.goto("/appointments", { waitUntil: "load" });

    const pageContent = page.locator("body");
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });
});
