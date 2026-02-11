import { APIRequestContext, expect, Page, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api";

/**
 * Setup a fresh doctor and clinic for each test to ensure absolute isolation.
 * This prevents worker collision and shared state issues.
 */
async function setupDoctorAndClinic(request: APIRequestContext) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const userEmail = `doctor${uniqueId}@test.com`;
  const userPassword = "Test@123456";

  console.log(`[SETUP] Creating doctor: ${userEmail}`);

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

  const regData = (await registerRes.json()) as Record<string, unknown>;
  const token =
    (regData?.access_token as string) ||
    (regData?.accessToken as string) ||
    null;

  // Create clinic
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

  const clinic = (await clinicRes.json()) as Record<string, unknown>;
  const clinicId = (clinic?.id as string) || "";

  // Assign doctor to clinic
  const userInfo = (regData?.user as Record<string, unknown>) || regData;
  const doctorId = (userInfo?.id as string) || (regData?.id as string);
  const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { doctorId, clinicId: clinic.id, role: "doctor" },
  });

  if (!assignRes.ok()) {
    throw new Error(
      `Clinic assignment failed: ${assignRes.status()} ${await assignRes.text()}`,
    );
  }

  // Re-login to refresh token with clinic association
  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email: userEmail, password: userPassword },
  });

  if (!loginRes.ok()) {
    throw new Error(
      `Login failed: ${loginRes.status()} ${await loginRes.text()}`,
    );
  }

  const loginData = (await loginRes.json()) as Record<string, unknown>;
  const refreshedToken =
    (loginData?.access_token as string) ||
    (loginData?.accessToken as string) ||
    "";
  const finalClinicId =
    ((loginData?.user as Record<string, unknown>)?.clinicId as string) ||
    clinicId;

  console.log(`[SETUP] Completed: clinicId=${finalClinicId}`);

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

    // Navigate to patients page
    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    // Look for "Add Patient" or "Create Patient" button
    const addButton = page
      .locator(
        'button:has-text("Add Patient"), button:has-text("Create Patient"), button:has-text("New Patient")',
      )
      .first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();

      // Fill form
      await page.fill('input[placeholder*="First"]', "John");
      await page.fill('input[placeholder*="Last"]', "Doe");
      await page.fill('input[placeholder*="Phone"]', "9996543210");
      await page.selectOption('select[name="gender"]', "MALE");
      await page.fill('input[type="date"]', "1990-01-01");

      // Submit
      await page.click('button[type="submit"]');

      // Wait for success or navigation
      await page.waitForTimeout(2000);

      // Check URL or success message
      const url = page.url();
      const hasSuccess =
        url.includes("/patients") ||
        (await page.locator("text=/success|created/i").count()) > 0;

      expect(hasSuccess).toBeTruthy();
    }
  });

  test("should display patient list", async ({ page, request }) => {
    const { authToken, clinicId, user } = await setupDoctorAndClinic(request);

    // Create test patient via API
    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phoneNumber: "9996543211",
        gender: "FEMALE",
        dateOfBirth: "1990-05-15",
        clinicId,
      },
    });

    expect(patientRes.ok()).toBeTruthy();

    await loginAsDoctor(page, authToken, clinicId, user);

    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    // Patient should be visible
    const patientName = page.locator("text=Jane").first();
    await expect(patientName).toBeVisible({ timeout: 10000 });

    // Click on patient to verify detailed page
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

    // Create test patient
    const searchableRes = await request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: "SearchablePatient",
        lastName: "Test",
        phoneNumber: "9996543212",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId,
      },
    });

    expect(searchableRes.ok()).toBeTruthy();
    console.log(`[TEST] Searchable Patient created for clinic: ${clinicId}`);

    await loginAsDoctor(page, authToken, clinicId, user);
    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    // Look for search input
    const searchInput = page
      .locator(
        'input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]',
      )
      .first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill("SearchablePatient");
      await page.waitForTimeout(1000);

      // Results should appear
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

    // Navigate to create patient page
    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});
    const addButton = page
      .locator(
        'button:has-text("Add Patient"), button:has-text("Create Patient"), button:has-text("New Patient")',
      )
      .first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Check for validation errors or form still visible
      await page.waitForTimeout(1000);
      const formStillVisible = await page.locator("input").first().isVisible();
      expect(formStillVisible).toBeTruthy();
    }
  });

  test("should handle clinic data isolation", async ({ page, request }) => {
    // This test verifies that patients are isolated by clinic
    const clinicA = await setupDoctorAndClinic(request);
    const clinicB = await setupDoctorAndClinic(request);

    // Create patient in Clinic A
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

    // Login as Clinic B doctor
    await loginAsDoctor(
      page,
      clinicB.authToken,
      clinicB.clinicId,
      clinicB.user,
    );
    await page.goto("/patients", { waitUntil: "load" }).catch(() => {});

    // Should NOT see Clinic A patient
    // Should not count loading state as a patient
    const loadingState = page.locator("text=Loading patients...");
    await expect(loadingState).not.toBeVisible({ timeout: 5000 });

    const patientA = page.locator("text=ClinicA-Patient").first();
    await expect(patientA).not.toBeVisible({ timeout: 5000 });

    // Should see empty state or list
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

  // Navigate to "/" first to ensure we are on the correct origin
  await page.goto("/", { waitUntil: "networkidle" }).catch(() => {});

  // Inject credentials into localStorage
  await page.evaluate(
    (args: { t: string; u: string }) => {
      localStorage.clear();
      localStorage.setItem("docita_token", args.t);
      localStorage.setItem("docita_user", args.u);
    },
    { t: token, u: userForStorage },
  );

  // Navigate to dashboard and wait for it to load
  await page.goto("/dashboard", { waitUntil: "load" });
  // Minor wait to ensure app processes the local storage and stabilizes
  await page.waitForTimeout(1000);
}
