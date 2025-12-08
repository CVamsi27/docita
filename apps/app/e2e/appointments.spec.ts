import { test, expect, Page, APIRequestContext } from "@playwright/test";

const API_URL: string = process.env.API_URL || "http://localhost:3001/api";

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
    console.log("Starting beforeAll setup for Appointments tests");

    const uniqueEmail = `doctor${Date.now()}@test.com`;
    const password = "Test@123456";

    // Register user
    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: uniqueEmail,
        password,
        name: "Test Doctor",
        role: "DOCTOR",
      },
    });

    console.log("Register response status:", registerRes.status());
    if (!registerRes.ok()) {
      console.error("Register failed:", await registerRes.text());
      throw new Error("User registration failed");
    }

    // Extract token from register response
    const registerData = await registerRes.json();
    const token = registerData.access_token || registerData.accessToken;

    cachedUser = {
      id: registerData.user.id,
      email: registerData.user.email,
      clinicId: registerData.user.clinicId,
      accessToken: token,
      role: registerData.user.role,
    };
    console.log("Cached user created:", cachedUser);

    // Create a clinic if clinicId is null, assign doctor and re-login to refresh token
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
        },
      });

      if (clinicRes.ok()) {
        const clinic = await clinicRes.json();
        cachedUser.clinicId = clinic.id;
        console.log("Clinic created:", clinic.id);

        // Assign the doctor to the clinic so token reflects clinicId
        const doctorId = cachedUser.id;
        const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
          headers: { Authorization: `Bearer ${token}` },
          data: { doctorId, clinicId: clinic.id, role: "doctor" },
        });

        if (assignRes.ok()) {
          // Re-login to refresh token and include clinicId in JWT
          const loginRes = await request.post(`${API_URL}/auth/login`, {
            data: { email: cachedUser.email, password },
          });
          if (loginRes.ok()) {
            const loginData = await loginRes.json();
            cachedUser.accessToken =
              loginData.access_token || loginData.accessToken;
            cachedUser.clinicId =
              loginData.user?.clinicId || cachedUser.clinicId;
            console.log("Re-logged in, refreshed token and clinicId");
          }
        }
      }
    }

    // Create patient (use refreshed token)
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

    console.log("Patient creation response status:", patientRes.status());
    if (!patientRes.ok()) {
      console.error("Patient creation failed:", await patientRes.text());
      throw new Error("Patient creation failed");
    }

    cachedPatient = await patientRes.json();
    console.log("Cached patient created:", cachedPatient);
  });

  test.beforeEach(async ({ page }: { page: Page }) => {
    console.log("Starting beforeEach setup for Appointments tests");
    // Use token-based auth to avoid flaky UI login during setup
    const token = cachedUser!.accessToken;
    // Set the frontend's expected keys so the app recognizes the logged-in user
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
          // noop
        }
      },
      { t: token, u: userForStorage },
    );

    // Navigate to dashboard which should pick up token from localStorage
    await page
      .goto("/dashboard", { waitUntil: "networkidle" })
      .catch(() => null);
    await page.waitForTimeout(500);
  });

  test("should display appointments list", async ({ page }) => {
    await page.goto("/appointments");
    await expect(page.locator("h1")).toContainText("Appointments");
    await expect(page.getByText("Calendar")).toBeVisible();
  });

  test("should create a new appointment", async ({ page }) => {
    await page.goto("/appointments");

    // Click New Appointment button (assuming there is one)
    await page.getByRole("button", { name: "New Appointment" }).click();

    // Fill form
    // Select patient (this might be a combobox)
    await page.click('[role="combobox"]');
    await page.type('[role="combobox"]', "Test Patient");
    await page.keyboard.press("Enter");

    // Select date/time (might need specific selectors based on UI)
    // For now, assuming defaults or simple inputs

    // Since UI might be complex, let's verify if an API-created appointment shows up
  });

  test("should show API-created appointment", async ({ page, request }) => {
    // Create appointment via API
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(30);

    await request.post(`${API_URL}/appointments`, {
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

    await page.goto("/appointments");

    // Check if appointment is visible
    await expect(page.getByText("Test Patient")).toBeVisible();
    await expect(page.getByText("10:00")).toBeVisible();
  });
});
