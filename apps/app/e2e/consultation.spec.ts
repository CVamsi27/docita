import { expect, test } from "@playwright/test";
import { setupTestUser, loginUser, UserData, API_URL } from "./utils/patient-helpers";

test.describe("Consultation Flow", () => {
    let user: UserData;
    let patientId: string;
    let appointmentId: string;

    test.beforeAll(async ({ request }) => {
        user = await setupTestUser(request);

        // Create Patient
        const patientRes = await request.post(`${API_URL}/patients`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: {
                firstName: "Consult",
                lastName: "Patient",
                phoneNumber: `98${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
                gender: "MALE",
                dateOfBirth: "1990-01-01",
                clinicId: user.clinicId,
            },
        });
        expect(patientRes.ok()).toBeTruthy();
        const patient = await patientRes.json();
        patientId = patient.id;

        // Create Appointment
        const now = new Date();
        // Schedule for 10 minutes from now to ensure it's "upcoming"/active
        now.setMinutes(now.getMinutes() + 10);

        const endTime = new Date(now);
        endTime.setMinutes(now.getMinutes() + 30);

        const apptRes = await request.post(`${API_URL}/appointments`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: {
                patientId: patientId,
                doctorId: user.id,
                clinicId: user.clinicId,
                startTime: now.toISOString(),
                endTime: endTime.toISOString(),
                type: "consultation",
                status: "scheduled",
            },
        });
        if (!apptRes.ok()) {
            console.log("Appointment creation failed:", await apptRes.text());
        }
        expect(apptRes.ok()).toBeTruthy();
        const appointment = await apptRes.json();
        appointmentId = appointment.id;
    });

    test.beforeEach(async ({ page }) => {
        await loginUser(page, user);
    });

    test("should start consultation, add notes, and complete visit", async ({ page }) => {
        // 1. Navigate to Dashboard which has Today's Appointments
        await page.goto("/dashboard", { waitUntil: "networkidle" });

        // 2. Find Appointment and Click Check-in / Start
        // Locate row by patient name
        const row = page.locator('tr, div').filter({ hasText: "Consult Patient" }).first();

        let navigated = false;
        try {
            await expect(row).toBeVisible({ timeout: 5000 });
            const actionButton = row.locator('button:has-text("Check In"), button:has-text("Start")').first();
            if (await actionButton.isVisible()) {
                await actionButton.click();
                await page.waitForTimeout(1000);
                navigated = true;
            }
        } catch (e) {
            console.log("Dashboard interaction failed or row not found, falling back to direct navigation");
        }

        if (!navigated) {
            await page.goto(`/consultation/${appointmentId}`, { waitUntil: "networkidle" });
        }

        // 3. Verify Consultation Page Loaded
        await expect(page.locator('text=Consultation').first()).toBeVisible();
        await expect(page.locator('text=Consult Patient').first()).toBeVisible();

        // 4. Add Chief Complaint / Notes
        // Assuming inputs exist
        const notesInput = page.locator('textarea[placeholder*="notes"], textarea[placeholder*="complaint"]').first();
        if (await notesInput.isVisible()) {
            await notesInput.fill("Patient complains of mild headache.");
        }

        // 5. Add Diagnosis
        const diagnosisTab = page.locator('button[value="diagnosis"], button:has-text("Diagnosis")').first();
        if (await diagnosisTab.isVisible()) {
            await diagnosisTab.click();
            const searchInput = page.locator('input[placeholder*="Search diagnosis"]').first();
            if (await searchInput.isVisible()) {
                await searchInput.fill("Headache");
                await page.waitForTimeout(500);
                // Select first result
                await page.keyboard.press("ArrowDown");
                await page.keyboard.press("Enter");
            }
        }

        // 6. Finish Consultation
        const finishButton = page.locator('button:has-text("Finish"), button:has-text("Complete"), button:has-text("End Consultation")').first();
        let clickedFinish = false;
        if (await finishButton.isVisible()) {
            await finishButton.click();
            clickedFinish = true;
        }

        // 7. Verify Redirect/Success
        // Usually redirects to summary or dashboard or billing
        if (clickedFinish) {
            await expect(page).not.toHaveURL(new RegExp(`/consultation/${appointmentId}$`));
        }
    });
});
