import { expect, test, type Page } from "@playwright/test";
import {
  API_URL,
  loginUser,
  setupTestUser,
  UserData,
} from "./utils/patient-helpers";

async function openConsultationEditor(page: Page, id: string) {
  await page.goto(`/consultation/${id}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await expect(page).toHaveURL(new RegExp(`/consultation/${id}(?:\\?|$)`), {
    timeout: 25_000,
  });
  await expect(
    page.locator('main[aria-label="Consultation workspace"] #hpi'),
  ).toBeVisible({ timeout: 25_000 });
}

test.describe("Consultation Flow", () => {
  test.describe.configure({ timeout: 180_000 });

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
    expect(apptRes.ok()).toBeTruthy();
    const appointment = await apptRes.json();
    appointmentId = appointment.id;
  });

  test.beforeEach(async ({ page }) => {
    await loginUser(page, user);
  });

  test("should start consultation, add notes, and complete visit", async ({
    page,
  }) => {

    await openConsultationEditor(page, appointmentId);

    const addComplaintBtn = page.locator('button:has-text("Add Complaint")');
    if (await addComplaintBtn.isVisible()) {
      await addComplaintBtn.click();
      const symptomInput = page.locator('input[placeholder*="Symptom"]');
      await expect(symptomInput).toBeVisible();
      await symptomInput.fill("Severe Headache");

      const durationInput = page.locator('input[placeholder="Duration"]');
      await durationInput.fill("2");

    }

    const assessmentTab = page.getByRole("button", { name: /Assessment/i });
    if (await assessmentTab.isVisible()) {
      await assessmentTab.click();
    }

    const addDiagnosisBtn = page.locator('button:has-text("Add Diagnosis")');
    if (await addDiagnosisBtn.isVisible()) {
      await addDiagnosisBtn.click();
      const assessment = page.getByRole("region", { name: /Assessment/i });
      await assessment.scrollIntoViewIfNeeded();
      const conditionInput = assessment.getByPlaceholder("Condition name");
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

  test("maps legacy tab query to section in URL", async ({ page }) => {
    await page.goto(`/consultation/${appointmentId}?tab=treatment`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await expect(page).toHaveURL(/section=plan/, { timeout: 20_000 });
  });

  test("shows leave confirmation when draft is dirty", async ({ page }) => {
    await openConsultationEditor(page, appointmentId);

    const hpi = page.locator("#hpi");
    await expect(hpi).toBeVisible({ timeout: 15000 });
    await hpi.fill("Leave guard integration test note");

    await page.getByRole("button", { name: "Back" }).click();

    await expect(
      page.getByRole("heading", { name: /Leave consultation/i }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Stay" }).click();
    await expect(page).toHaveURL(new RegExp(`/consultation/${appointmentId}`));
  });

  test("leave without saving navigates away from consultation workspace", async ({
    page,
  }) => {
    await openConsultationEditor(page, appointmentId);

    const hpi = page.locator("#hpi");
    await expect(hpi).toBeVisible({ timeout: 15000 });
    await hpi.fill("Leave without saving end-to-end test note");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: /Leave consultation/i }),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByRole("button", { name: "Leave without saving" }),
    ).toBeEnabled({ timeout: 20_000 });
    await page.getByRole("button", { name: "Leave without saving" }).click();

    await expect(page).toHaveURL(/\/consultation\/?(\?.*)?$/, { timeout: 25_000 });
    await expect(page).not.toHaveURL(
      new RegExp(`/consultation/${appointmentId}(?:/|\\?|$)`),
    );
  });

  test("sidebar in-app link opens leave dialog when draft is dirty", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openConsultationEditor(page, appointmentId);

    const hpi = page.locator("#hpi");
    await expect(hpi).toBeVisible({ timeout: 15000 });
    await hpi.fill("Sidebar leave guard integration test");

    const dashboardLink = page.locator("aside a[href=\"/dashboard\"]").first();
    await expect(dashboardLink).toBeVisible({ timeout: 10000 });
    await dashboardLink.click();

    await expect(
      page.getByRole("heading", { name: /Leave consultation/i }),
    ).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Stay" }).click();
    await expect(page).toHaveURL(new RegExp(`/consultation/${appointmentId}`));
  });

  test("save and leave navigates away from consultation workspace", async ({
    page,
  }) => {
    await openConsultationEditor(page, appointmentId);

    const hpi = page.locator("#hpi");
    await expect(hpi).toBeVisible({ timeout: 15000 });
    await hpi.fill("Save and leave end-to-end test note");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(
      page.getByRole("heading", { name: /Leave consultation/i }),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByRole("button", { name: "Save and leave" }),
    ).toBeEnabled({ timeout: 20_000 });
    await page.getByRole("button", { name: "Save and leave" }).click();

    await expect(page).toHaveURL(/\/consultation\/?(\?.*)?$/, { timeout: 25_000 });
    await expect(page).not.toHaveURL(
      new RegExp(`/consultation/${appointmentId}(?:/|\\?|$)`),
    );
  });
});
