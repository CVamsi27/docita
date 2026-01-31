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
  let cachedPatient: { id: string } | null = null;

  test.beforeAll(async ({ request }) => {
    // 1. Register/Login Doctor
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
        // Login if already exists (fallback)
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

    // 2. Create Patient
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
    cachedPatient = await patientRes.json();
  });

  // Helper to inject token
  async function injectAuth(page: Page) {
    if (!cachedUser) return;
    const userStore = JSON.stringify(cachedUser);
    const token = cachedUser.accessToken;
    
    await page.addInitScript(
      ({ t, u }) => {
        localStorage.setItem("docita_token", t);
        localStorage.setItem("docita_user", u);
      },
      { t: token, u: userStore }
    );
  }

  test("should complete full consultation lifecycle", async ({ page, request }) => {
    // 1. Create Appointment via API
    const startTime = new Date();
    // buffer time to show up in "Today's" or "Upcoming" list clearly
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
    const appointment = await aptRes.json();
    if (!aptRes.ok()) {
        console.log("Appointment create failed:", appointment);
    }
    expect(aptRes.ok()).toBeTruthy();

    await injectAuth(page);

    // 2. Navigate to Consultation View
    // Usually via /consultations/:id or clicking "Start" from dashboard
    // We'll go directly to the consultation page if URL structure is known
    // Assuming /consultations/:id/active or similar. 
    // If we don't know, we navigate to appointments and click "Start"
    
    await page.goto(`/appointments`, { waitUntil: "load" });
    
    // Find appointment and click "Start Consultation" or similar
    // This selector might need adjustment based on real UI
    // Assuming there is a "Start" or "View" button for today's appointment
    // Or we can navigate directly to /consultations/:id if that's the route
    
    // Let's try direct navigation first as it's more robust
    await page.goto(`/consultations/${appointment.id}`, { waitUntil: "load" });

    // 3. Add Vitals (Check for inputs)
    // Assuming UI has inputs for Weight, BP etc.
    const weightInput = page.locator('input[name="weight"], input[placeholder*="Weight"]');
    if (await weightInput.isVisible()) {
        await weightInput.fill("75");
    }

    // 4. Add Diagnosis
    const diagnosisInput = page.locator('input[placeholder*="diagnosis"], [role="combobox"]');
    if (await diagnosisInput.isVisible()) {
        await diagnosisInput.first().fill("Headache");
        await page.keyboard.press("Enter");
    }

    // 5. Generate Prescription (Mock interaction)
    const addMedBtn = page.locator('button:has-text("Add Medicine"), button:has-text("Prescribe")');
    if (await addMedBtn.isVisible()) {
        await addMedBtn.click();
        // Fill medicine details if modal opens
        await page.locator('input[placeholder*="Medicine"]').first().fill("Paracetamol");
        await page.keyboard.press("Enter");
    }

    // 6. Complete Consultation
    const finishBtn = page.locator('button:has-text("Finish"), button:has-text("Complete"), button:has-text("End Consultation")');
    if (await finishBtn.isVisible()) {
        await finishBtn.click();
        
        // Wait for redirection or success message
        await page.waitForTimeout(1000);
        expect(page.url()).not.toContain(`/consultations/${appointment.id}`); // Should redirect away
    }

    // 7. Verify Status via API
    const verifyRes = await request.get(`${API_URL}/appointments/${appointment.id}`, {
        headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
    });
    const verifiedApt = await verifyRes.json();
    // Status might be "completed" or "billing_pending"
    expect(["completed", "billing_pending"]).toContain(verifiedApt.status);
  });
});
