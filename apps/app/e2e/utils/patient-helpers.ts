import { APIRequestContext, Page } from "@playwright/test";

export const API_URL = process.env["API_URL"] || "http://127.0.0.1:3001/api";
export const TEST_PASSWORD = "Test@123456";

export interface UserData {
  id: string;
  email: string;
  clinicId: string;
  accessToken: string;
}

export async function fetchPatientByApi(
  request: APIRequestContext,
  id: string,
  token: string,
) {
  try {
    const res = await request.get(`${API_URL}/patients/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) {

      return null;
    }
    return await res.json();
  } catch (err) {

    return null;
  }
}

export async function setupTestUser(
  request: APIRequestContext,
): Promise<UserData> {
  const uniqueEmail = `doctor${Date.now()}@test.com`;
  const password = TEST_PASSWORD;

  const registerRes = await request.post(`${API_URL}/auth/register`, {
    data: {
      email: uniqueEmail,
      password,
      firstName: "Dr.",
      lastName: "History",
      role: "DOCTOR",
      clinicName: "Test Clinic",
    },
  });

  if (!registerRes.ok()) {
    throw new Error(`User registration failed: ${await registerRes.text()}`);
  }

  const registerData = await registerRes.json();
  const token = registerData.access_token || registerData.accessToken;

  const userData: UserData = {
    id: registerData.user.id,
    email: registerData.user.email,
    clinicId: registerData.user.clinicId,
    accessToken: token,
  };

  try {
    const clinicRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "History Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "1234567890",
        address: "123 History St",
        tier: "ENTERPRISE",
      },
    });

    if (clinicRes.ok()) {
      const clinic = await clinicRes.json();
      const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          doctorId: userData.id,
          clinicId: clinic.id,
          role: "doctor",
        },
      });

      if (assignRes.ok()) {
        const loginRes = await request.post(`${API_URL}/auth/login`, {
          data: { email: userData.email, password },
        });
        if (loginRes.ok()) {
          const loginData = await loginRes.json();
          userData.accessToken =
            loginData.access_token || loginData.accessToken;
          userData.clinicId = loginData.user?.clinicId || userData.clinicId;
        } else {

          throw new Error("Login failed during test user setup");
        }
      }
    }
  } catch (err) {

    throw err;
  }

  if (!userData.accessToken) {
    throw new Error("No access token obtained for test user");
  }

  return userData;
}

export async function loginUser(page: Page, user: UserData) {
  await page.goto("/login");

  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(user.email);
  await page.click('button:has-text("Continue")');

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.fill(TEST_PASSWORD);

  await page.click('button:has-text("Sign In")');

  try {
    await page.waitForURL("/dashboard", { timeout: 10000 });
  } catch {

  }
}
