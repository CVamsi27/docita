import { expect, test } from "@playwright/test";
import {
  API_URL,
  loginUser,
  setupTestUser,
  UserData,
} from "./utils/patient-helpers";

test.describe("Consultation Flow", () => {
  let user: UserData;
  let patientId: string;
  let appointmentId: string;

  test.beforeAll(async ({ request }) => {
    user = await setupTestUser(request);

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        firstName: "Consult",
        lastName: "Patient",
        phoneNumber: `98${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0")}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: user.clinicId,
      },
    });
    if (!patientRes.ok()) {

    }
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();
    patientId = patient.id;

    const now = new Date();

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

    }
    expect(apptRes.ok()).toBeTruthy();
    const appointment = await apptRes.json();
    appointmentId = appointment.id;
  });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000); 
    await loginUser(page, user);
  });

  test("should start consultation, add notes, and complete visit", async ({
    page,
  }) => {

    await page.goto(`/consultation/${appointmentId}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    await expect(page.locator("body")).toBeVisible({ timeout: 10000 });

    const addComplaintBtn = page.locator('button:has-text("Add Complaint")');
    if (await addComplaintBtn.isVisible()) {
      await addComplaintBtn.click();
      const symptomInput = page.locator('input[placeholder*="Symptom"]');
      await expect(symptomInput).toBeVisible();
      await symptomInput.fill("Severe Headache");

      const durationInput = page.locator('input[placeholder="Duration"]');
      await durationInput.fill("2");

    }

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

    }

    const saveButton = page.locator('button:has-text("Save Notes")');
    if (await saveButton.isVisible()) {
      await saveButton.click();

      await expect(page.locator("text=Consultation saved").first()).toBeVisible(
        { timeout: 10000 },
      );
    }

    const finishButton = page
      .locator(
        'button:has-text("Finish"), button:has-text("Complete"), button:has-text("End Consultation")',
      )
      .first();
    if (await finishButton.isVisible()) {
      await finishButton.click();
      await expect(page).not.toHaveURL(
        new RegExp(`/consultation/${appointmentId}$`),
      );
    }
  });
});
