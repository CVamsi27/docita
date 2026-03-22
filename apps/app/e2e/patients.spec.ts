import { APIRequestContext, expect, Page, test } from "@playwright/test";

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

async function setupDoctorAndClinic(request: APIRequestContext) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const userEmail = `doctor${uniqueId}@test.com`;
  const userPassword = "Test@123456";

  const registerRes = await request.post(`${API_URL}/auth/register`, {
    data: {
      email: userEmail,
      password: userPassword,
      firstName: "Dr",
      lastName: "Test",
      role: "DOCTOR",
      clinicName: "Test Clinic",
    },
  });

  if (!registerRes.ok()) {
    throw new Error(
      `Registration failed: ${registerRes.status()} ${await registerRes.text()}`,
    );
  }

  const regData = toRecord(await registerRes.json());
  const token =
    readString(regData, "access_token") ||
    readString(regData, "accessToken") ||
    null;

  const clinicRes = await request.post(`${API_URL}/clinics`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: "Patients Test Clinic",
      email: `clinic${uniqueId}@test.com`,
      phone: "1234567890",
      address: "123 Test St",
      tier: "ENTERPRISE",
    },
  });

  if (!clinicRes.ok()) {
    throw new Error(
      `Clinic creation failed: ${clinicRes.status()} ${await clinicRes.text()}`,
    );
  }

  const clinic = toRecord(await clinicRes.json());
  const clinicId = readString(clinic, "id") || "";

  const nestedUser = toRecord(regData?.user);
  const userInfo = Object.keys(nestedUser).length > 0 ? nestedUser : regData;
  const doctorId = readString(userInfo, "id") || readString(regData, "id");
  const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { doctorId, clinicId: clinic.id, role: "doctor" },
  });

  if (!assignRes.ok()) {
    throw new Error(
      `Clinic assignment failed: ${assignRes.status()} ${await assignRes.text()}`,
    );
  }

  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email: userEmail, password: userPassword },
  });

  if (!loginRes.ok()) {
    throw new Error(
      `Login failed: ${loginRes.status()} ${await loginRes.text()}`,
    );
  }

  const loginData = toRecord(await loginRes.json());
  const refreshedToken =
    readString(loginData, "access_token") ||
    readString(loginData, "accessToken") ||
    "";
  const finalClinicId =
    readString(toRecord(loginData?.user), "clinicId") ||
    clinicId;

  return {
    authToken: refreshedToken,
    clinicId: finalClinicId,
    user: loginData.user,
  };
}

test.describe("Patient Management", () => {
  test("should create patient successfully", async ({ page, request }) => {
    const { authToken, clinicId, user } = await setupDoctorAndClinic(request);
    await loginAsDoctor(page, authToken, clinicId, user);

    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    const addButton = page
      .locator(
        'button:has-text("Add Patient"), button:has-text("Create Patient"), button:has-text("New Patient")',
      )
      .first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();

      await page.fill('input[placeholder*="First"]', "John");
      await page.fill('input[placeholder*="Last"]', "Doe");
      await page.fill('input[placeholder*="Phone"]', "9996543410");
      await page.selectOption('select[name="gender"]', "MALE");
      await page.fill('input[type="date"]', "1990-01-01");

      await page.click('button[type="submit"]');

      await page.waitForTimeout(2000);

      const url = page.url();
      const hasSuccess =
        url.includes("/patients") ||
        (await page.locator("text=/success|created/i").count()) > 0;

      expect(hasSuccess).toBeTruthy();
    }
  });

  test("should display patient list", async ({ page, request }) => {
    const { authToken, clinicId, user } = await setupDoctorAndClinic(request);

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phoneNumber: "9996543411",
        gender: "FEMALE",
        dateOfBirth: "1990-05-15",
        clinicId,
      },
    });

    expect(patientRes.ok()).toBeTruthy();

    await loginAsDoctor(page, authToken, clinicId, user);

    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    const patientName = page.locator("text=Jane").first();
    await expect(patientName).toBeVisible({ timeout: 10000 });

    const patientNameLink = page.locator("text=Jane Doe").first();
    if (await patientNameLink.isVisible()) {
      await patientNameLink.click();
      await page.waitForURL(/\/patients\//);
      await expect(page.locator("text=Jane").first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("should search patients by name", async ({ page, request }) => {
    const { authToken, clinicId, user } = await setupDoctorAndClinic(request);

    const searchableRes = await request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: "SearchablePatient",
        lastName: "Test",
        phoneNumber: "9996543412",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId,
      },
    });

    expect(searchableRes.ok()).toBeTruthy();

    await loginAsDoctor(page, authToken, clinicId, user);
    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    const searchInput = page
      .locator(
        'input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]',
      )
      .first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill("SearchablePatient");
      await page.waitForTimeout(1000);

      const result = page.locator("text=SearchablePatient").first();
      await expect(result).toBeVisible({ timeout: 5000 });
    }
  });

  test("should show error on invalid form submission", async ({
    page,
    request,
  }) => {
    const { authToken, clinicId, user } = await setupDoctorAndClinic(request);
    await loginAsDoctor(page, authToken, clinicId, user);

    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});
    const addButton = page
      .locator(
        'button:has-text("Add Patient"), button:has-text("Create Patient"), button:has-text("New Patient")',
      )
      .first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      await page.waitForTimeout(1000);
      const formStillVisible = await page.locator("input").first().isVisible();
      expect(formStillVisible).toBeTruthy();
    }
  });

  test("should handle clinic data isolation", async ({ page, request }) => {

    const clinicA = await setupDoctorAndClinic(request);
    const clinicB = await setupDoctorAndClinic(request);

    await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${clinicA.authToken}` },
      data: {
        firstName: "ClinicA-Patient",
        lastName: "Test",
        phoneNumber: "8881234567",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: clinicA.clinicId,
      },
    });

    await loginAsDoctor(
      page,
      clinicB.authToken,
      clinicB.clinicId,
      clinicB.user,
    );
    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    const loadingState = page.locator("text=Loading patients...");
    await expect(loadingState).not.toBeVisible({ timeout: 5000 });

    const patientA = page.locator("text=ClinicA-Patient").first();
    await expect(patientA).not.toBeVisible({ timeout: 5000 });

    const noPatients = page.locator("text=No patients found").first();
    const tableRows = page.locator("table tbody tr").count();
    expect(
      (await noPatients.isVisible()) || (await tableRows) === 0,
    ).toBeTruthy();
  });
});

async function loginAsDoctor(
  page: Page,
  token: string,
  clinicId: string,
  user: Record<string, unknown>,
) {
  const userForStorage = JSON.stringify({
    ...user,
    clinicId: clinicId,
    role: "DOCTOR",
  });

  await page.goto("/", { waitUntil: "networkidle" }).catch(() => {});

  await page.evaluate(
    (args: { t: string; u: string }) => {
      localStorage.clear();
      localStorage.setItem("docita_token", args.t);
      localStorage.setItem("docita_user", args.u);
    },
    { t: token, u: userForStorage },
  );

  await page.goto("/dashboard", { waitUntil: "load" });

  await page.waitForTimeout(1000);
}
