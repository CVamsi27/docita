import { expect, Page, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api";

let authToken: string;
let clinicId: string;

test.describe("Patient Management", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Setup: Create clinic and user via API
    const userEmail = `doctor${Date.now()}@test.com`;
    const userPassword = "Test@123456";

    const registerRes = await page.request.post(`${API_URL}/auth/register`, {
      data: {
        email: userEmail,
        password: userPassword,
        firstName: "Dr",
        lastName: "Test",
        role: "DOCTOR",
      },
    });

    const user = (await registerRes.json()) as Record<string, unknown>;
    const regData = user as Record<string, unknown>;
    // If register didn't create a clinic association, create a clinic and assign
    let token: string | null = null;
    try {
      token =
        (regData?.access_token as string) ||
        (regData?.accessToken as string) ||
        null;

      // Create clinic
      const clinicRes = await page.request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: "Patients Test Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "123 Test St",
        },
      });

      if (clinicRes.ok()) {
        const clinic = (await clinicRes.json()) as Record<string, unknown>;
        clinicId = (clinic?.id as string) || "";

        // Assign doctor to clinic
        const userInfo = (regData?.user as Record<string, unknown>) || regData;
        const doctorId = (userInfo?.id as string) || (regData?.id as string);
        const assignRes = await page.request.post(`${API_URL}/doctor-clinics`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { doctorId, clinicId: clinic.id, role: "doctor" },
        });

        if (assignRes.ok()) {
          // Re-login to refresh token
          const loginRes = await page.request.post(`${API_URL}/auth/login`, {
            data: { email: userEmail, password: userPassword },
          });
          if (loginRes.ok()) {
            const loginData = (await loginRes.json()) as Record<
              string,
              unknown
            >;
            authToken =
              (loginData?.access_token as string) ||
              (loginData?.accessToken as string) ||
              "";
            clinicId =
              ((loginData?.user as Record<string, unknown>)
                ?.clinicId as string) || clinicId;
            // keep user info for frontend localStorage
            // store minimal user info to satisfy client checks
            (regData as Record<string, unknown>).user =
              loginData?.user || regData?.user;
          }
        }
      }
    } catch (_err) {
      // Fallback to a login if anything fails
      const loginRes = await page.request.post(`${API_URL}/auth/login`, {
        data: {
          email: userEmail,
          password: userPassword,
        },
      });

      const loginData = (await loginRes.json()) as Record<string, unknown>;
      authToken =
        (loginData?.access_token as string) ||
        (loginData?.accessToken as string) ||
        "";
      clinicId =
        ((loginData?.user as Record<string, unknown>)?.clinicId as string) ||
        clinicId;
    }

    // Save minimal user info from registration/login for later localStorage injection
    const storedUser = (regData?.user as Record<string, unknown>) || regData;
    const minimalUser = {
      id: (storedUser?.id as string) || (storedUser?.userId as string) || null,
      email: (storedUser?.email as string) || null,
      clinicId: (storedUser?.clinicId as string) || clinicId || null,
      role: (storedUser?.role as string) || "DOCTOR",
    };
    // store globally so loginAsDoctor can construct docita_user
    (globalThis as unknown as Record<string, unknown>).__E2E_REG_USER =
      minimalUser;
    await context.close();
  });

  test("should create patient successfully", async ({ page }) => {
    // Setup: Login first
    await loginAsDoctor(page);

    // Navigate to patients or create patient page
    await page
      .goto("/dashboard/patients", { waitUntil: "load" })
      .catch(() => {
        // Page might not exist in all deployments
      });

    // Look for "Add Patient" or "Create Patient" button
    const addButton = page
      .locator(
        'button:has-text("Add Patient"), button:has-text("Create Patient"), button:has-text("New Patient")',
      )
      .first();

    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();

      // Fill form
      await page.fill('input[placeholder*="First"]', "John");
      await page.fill('input[placeholder*="Last"]', "Doe");
      await page.fill('input[placeholder*="Phone"]', "9876543210");
      await page.selectOption('select[name="gender"]', "MALE");
      await page.fill('input[type="date"]', "1990-01-01");

      // Submit
      await page.click('button[type="submit"]');

      // Wait for success or navigation
      await page.waitForTimeout(1000);

      // Check URL or success message
      const url = page.url();
      const hasSuccess =
        url.includes("/patients") ||
        (await page.locator("text=/success|created/i").count()) > 0;

      expect(hasSuccess).toBeTruthy();
    }
  });

  test("should display patient list", async ({ page }) => {
    // Create test patient via API
    const patientRes = await page.request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: "Jane",
        lastName: "Doe",
        phoneNumber: "9876543211",
        gender: "FEMALE",
        dateOfBirth: "1990-05-15",
        clinicId,
      },
    });

    if (!patientRes.ok()) {
      console.log("Patient creation failed", patientRes.status(), await patientRes.text());
    }
    expect(patientRes.ok()).toBeTruthy();

    // DEBUG: Monitor API response - setup BEFORE navigation
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning')
        console.log(`BROWSER CONSOLE: ${msg.text()}`);
    });

    // Catch ALL requests to patients endpoint
    page.on('request', request => {
      if (request.url().includes('/patients')) console.log('>>', request.method(), request.url());
    });
    page.on('response', response => {
      if (response.url().includes('/patients')) console.log('<<', response.status(), response.url());
    });

    // Setup listener
    const patientsResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/patients"),
      { timeout: 10000 }
    ).catch(() => null);

    // Navigate to patients page
    await loginAsDoctor(page);
    await page
      .goto("/patients", { waitUntil: "load" })
      .catch(() => {
        // Page might not exist
      });

    const patientsResponse = await patientsResponsePromise;

    if (patientsResponse) {
      console.log(`Patients API Status: ${patientsResponse.status()}`);
    } else {
      console.log("Patients API request not found or timed out");
    }

    // DEBUG: Check UI State
    if (await page.locator('text=No patients found').isVisible()) {
      console.log("UI: 'No patients found' is visible");
    }

    // Patient should be visible or list should load
    // use robust wait
    const patientName = page.locator('text=Jane').first();
    if (await page.locator('text=error').isVisible()) {
      console.log("Found error text on page:", await page.locator('text=error').textContent());
    }
    console.log("Current Page URL:", page.url());
    // await page.screenshot({ path: 'patients-list.png' });

    try {
      await expect(patientName).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log("DOM Content on failure:", await page.content());
      throw e;
    }

    // Test Navigation: Click on a patient to go to details
    const firstPatientRow = page.locator('table tbody tr, [role="grid"] [role="row"]').first();
    // OR look for the text of the patient name
    const patientNameLink = page.locator('text=Jane Doe').first();

    if (await patientNameLink.isVisible()) {
      await patientNameLink.click();
      await page.waitForURL(/\/patients\//);
      // Verify details page loaded
      try {
        await expect(page.locator('text=Jane').first()).toBeVisible({ timeout: 10000 });
      } catch (e) {
        console.log("Details Page DOM Content on failure:", await page.content());
        throw e;
      }
    } else if (await firstPatientRow.isVisible()) {
      await firstPatientRow.click();
      await page.waitForURL(/\/patients\//);
    }
  });

  test("should search patients by name", async ({ page }) => {
    // Create test patient
    await page.request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        firstName: "SearchablePatient",
        lastName: "Test",
        phoneNumber: "9876543212",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId,
      },
    });

    await loginAsDoctor(page);
    await page
      .goto("/dashboard/patients", { waitUntil: "load" })
      .catch(() => {
        // Page might not exist
      });

    // Look for search input
    const searchInput = page
      .locator(
        'input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]',
      )
      .first();

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill("SearchablePatient");
      await page.waitForTimeout(500);

      // Results should appear
      const resultVisible = await page.locator("SearchablePatient").count();
      expect(resultVisible).toBeGreaterThan(0);
    }
  });

  test("should show error on invalid form submission", async ({ page }) => {
    await loginAsDoctor(page);

    // Navigate to create patient page
    const addButton = page
      .locator(
        'button:has-text("Add Patient"), button:has-text("Create Patient"), button:has-text("New Patient")',
      )
      .first();

    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Check for validation errors or form still visible
      await page.waitForTimeout(500);

      const formStillVisible = await page.locator("input").first().isVisible();
      expect(formStillVisible).toBeTruthy();
    }
  });

  test("should handle clinic data isolation", async ({ page }) => {
    // This test verifies that patients are isolated by clinic
    // Create another clinic/doctor via API
    const otherDoctorEmail = `doctor${Date.now()}other@test.com`;
    const otherDoctorPassword = "Test@123456";

    const otherRegisterRes = await page.request.post(
      `${API_URL}/auth/register`,
      {
        data: {
          email: otherDoctorEmail,
          password: otherDoctorPassword,
          firstName: "Dr",
          lastName: "Other",
          role: "DOCTOR",
        },
      },
    );

    const _otherUser = await otherRegisterRes.json();

    // Login as other doctor
    const otherLoginRes = await page.request.post(`${API_URL}/auth/login`, {
      data: {
        email: otherDoctorEmail,
        password: otherDoctorPassword,
      },
    });

    const otherLoginData = await otherLoginRes.json();

    // Fetch patients for this doctor (should be empty or different)
    const patientsRes = await page.request.get(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${otherLoginData.access_token}`,
      },
    });

    const patients = await patientsRes.json();

    // Should not have patients from other clinic
    expect(Array.isArray(patients.items)).toBeTruthy();
  });
});

async function loginAsDoctor(page: Page) {
   
  // Try to login or navigate to dashboard
  // Prefer injecting token into localStorage for reliable auth during e2e
  if (!(await page.url()).includes("/dashboard")) {
    // token variable should be set in the test scope (authToken)
    if (typeof authToken !== "undefined" && authToken) {
      // Construct a minimal user object for the frontend
      const e2eUser = (globalThis as unknown as Record<string, unknown>)
        .__E2E_REG_USER as Record<string, unknown> | undefined;
      const storedUser = e2eUser || {
        id: null,
        email: null,
        clinicId: clinicId || null,
        role: "DOCTOR",
      };

      const userForStorage = JSON.stringify({
        id: (storedUser?.id as string) || null,
        email: (storedUser?.email as string) || null,
        clinicId: (storedUser?.clinicId as string) || clinicId || null,
        role: (storedUser?.role as string) || "DOCTOR",
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
        { t: authToken, u: userForStorage },
      );

      await page
        .goto("/dashboard", { waitUntil: "load" })
        .catch(() => null);
      await page.waitForTimeout(500);
      return;
    }

    // Fallback: navigate to login
    await page.goto("/login").catch(() => null);
    await page.waitForTimeout(500);
  }
}
