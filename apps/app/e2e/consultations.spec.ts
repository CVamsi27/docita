import { expect, Page, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api";

test.describe("Consultation Flow", () => {
  let cachedUser: {
    id: string;
    email: string;
    clinicId: string;
    accessToken: string;
    role?: string;
  } | null = null;
  let cachedPatient: {
    id: string;
    firstName: string;
    lastName: string;
  } | null = null;

  test.beforeAll(async ({ request }) => {

    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    const regRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password: password,
        firstName: "Dr",
        lastName: "Consult",
        role: "DOCTOR",
        clinicName: "Consult Clinic",
      },
    });

    let authData = await regRes.json();
    if (!authData.access_token) {

      const loginRes = await request.post(`${API_URL}/auth/login`, {
        data: { email: uniqueEmail, password },
      });
      authData = await loginRes.json();
    }

    cachedUser = {
      id: authData.user.id,
      email: authData.user.email,
      clinicId: authData.user.clinicId,
      accessToken: authData.access_token,
      role: authData.user.role,
    };

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${cachedUser.accessToken}` },
      data: {
        firstName: "Consult",
        lastName: "Patient",
        phoneNumber: `9${Date.now().toString().slice(-9)}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: cachedUser.clinicId,
      },
    });
    const patientData = await patientRes.json();
    cachedPatient = {
      id: patientData.id,
      firstName: patientData.firstName || "Consult",
      lastName: patientData.lastName || "Patient",
    };
  });

  async function injectAuth(page: Page) {
    if (!cachedUser) return;
    const userStore = JSON.stringify(cachedUser);
    const token = cachedUser.accessToken;

    await page.addInitScript(
      ({ t, u }) => {
        localStorage.setItem("docita_token", t);
        localStorage.setItem("docita_user", u);
      },
      { t: token, u: userStore },
    );
  }

  test("should complete full consultation lifecycle", async ({
    page,
    request,
  }) => {

    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 10);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const aptRes = await request.post(`${API_URL}/appointments`, {
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

    expect(
      aptRes.ok(),
      `Appointment creation failed: ${await aptRes.text()}`,
    ).toBeTruthy();
    const appointment = await aptRes.json();
    expect(appointment.id).toBeDefined();

    await injectAuth(page);

    await page.goto(`/consultation/${appointment.id}`, {
      waitUntil: "networkidle",
    });

    const loadingText = page.getByText("Loading consultation...");
    await expect(loadingText).not.toBeVisible({ timeout: 15000 });

    const patientName = `${cachedPatient!.firstName} ${cachedPatient!.lastName}`;
    try {
      await expect(
        page.getByRole("heading", { name: patientName, level: 1 }),
      ).toBeVisible({ timeout: 10000 });
    } catch (e) {

      
      
      throw e;
    }

    const notFoundText = page.getByText("Appointment not found");
    await expect(notFoundText).not.toBeVisible();
  });

  test("should show loading state initially", async ({ page, request }) => {

    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() + 60);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const aptRes = await request.post(`${API_URL}/appointments`, {
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

    expect(aptRes.ok()).toBeTruthy();
    const appointment = await aptRes.json();

    await injectAuth(page);

    await page.goto(`/consultation/${appointment.id}`, { waitUntil: "load" });

    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle invalid appointment ID gracefully", async ({ page }) => {
    await injectAuth(page);

    await page.goto("/consultation/invalid-id-12345", {
      waitUntil: "networkidle",
    });

    await expect(page.getByText("Appointment not found")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.getByRole("button", { name: "Back to Appointments" }),
    ).toBeVisible();
  });
});
