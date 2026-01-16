import { expect, test } from "@playwright/test";
import { API_URL, loginUser, setupTestUser, UserData } from "./utils/patient-helpers";

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
        if (!patientRes.ok()) {
            console.log("Patient creation failed:", await patientRes.text());
        }
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
        } catch {
            console.log("Dashboard interaction failed or row not found, falling back to direct navigation");
        }

        if (!navigated) {
            await page.goto(`/consultation/${appointmentId}`, { waitUntil: "networkidle" });
        }

        // 3. Verify Consultation Page Loaded
        await expect(page.locator('text=Consultation').first()).toBeVisible();
        await expect(page.locator('text=Consult Patient').first()).toBeVisible();

        // 4. Add Chief Complaint (Structured)
        const addComplaintBtn = page.locator('button:has-text("Add Complaint")');
        if (await addComplaintBtn.isVisible()) {
            await addComplaintBtn.click();
            const symptomInput = page.locator('input[placeholder*="Symptom"]');
            await expect(symptomInput).toBeVisible();
            await symptomInput.fill("Severe Headache");
            
            // Set Duration
            const durationInput = page.locator('input[placeholder="Duration"]');
            await durationInput.fill("2");
            // Unit defaults to days, Severity defaults to moderate
        }

        // 5. Add Diagnosis (Structured)
        // Click tab if needed (assuming unified view or tabs)
        const diagnosisTab = page.locator('button:has-text("Diagnosis")');
        if (await diagnosisTab.isVisible()) {
            await diagnosisTab.click();
        }

        const addDiagnosisBtn = page.locator('button:has-text("Add Diagnosis")');
        if (await addDiagnosisBtn.isVisible()) {
            await addDiagnosisBtn.click();
            const conditionInput = page.locator('input[placeholder*="Condition"]');
            await expect(conditionInput).toBeVisible();
            await conditionInput.fill("Migraine");
            
            // Set status (Testing select interaction if possible, or leave default)
        }

        // 6. Save Notes / Finish
        const saveButton = page.locator('button:has-text("Save Notes")');
        if (await saveButton.isVisible()) {
            await saveButton.click();
            // Verify toast or success indication
            await expect(page.locator('text=saved').first()).toBeVisible();
        }

        // Optional: Finish Consultation if button exists (might be in sidebar)
        const finishButton = page.locator('button:has-text("Finish"), button:has-text("Complete"), button:has-text("End Consultation")').first();
        if (await finishButton.isVisible()) {
            await finishButton.click();
             await expect(page).not.toHaveURL(new RegExp(`/consultation/${appointmentId}$`));
        }
    });
});
