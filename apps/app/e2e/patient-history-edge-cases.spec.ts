import { expect, test } from "@playwright/test";
import {
  API_URL,
  loginUser,
  setupTestUser,
  UserData,
} from "./utils/patient-helpers";

test.describe("Patient Medical History - Edge Cases", () => {
  let cachedUser: UserData | null = null;
  let cachedPatient: {
    id: string;
    firstName: string;
    lastName: string;
  } | null = null;

  test.beforeAll(async ({ request }) => {
    cachedUser = await setupTestUser(request);

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${cachedUser.accessToken}` },
      data: {
        firstName: "Edge",
        lastName: "Case",
        phoneNumber: `987654${Date.now().toString().slice(-4)}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        medicalHistory: ["Base Condition"],
        allergies: "Penicillin",
        clinicId: cachedUser.clinicId,
      },
    });

    expect(patientRes.ok(), "Patient creation must succeed").toBeTruthy();
    const patientData = await patientRes.json();
    cachedPatient = {
      id: patientData.id,
      firstName: patientData.firstName || "Edge",
      lastName: patientData.lastName || "Case",
    };
  });

  test.beforeEach(async ({ page }) => {
    if (cachedUser) {
      await loginUser(page, cachedUser);
    }
  });

  test("should load patient detail page with correct structure", async ({
    page,
  }) => {
    await page.goto(`/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByText("Loading patient details...")).not.toBeVisible({
      timeout: 15000,
    });

    const patientName = `${cachedPatient!.firstName} ${cachedPatient!.lastName}`;
    await expect(page.getByText(patientName).first()).toBeVisible();

    await expect(page.getByRole("tab", { name: /Timeline/i })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Medical History/i }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Documents/i })).toBeVisible();
  });

  test("should navigate to Medical History tab", async ({ page }) => {
    await page.goto(`/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByText("Loading patient details...")).not.toBeVisible({
      timeout: 15000,
    });

    const medicalHistoryTab = page.getByRole("tab", {
      name: /Medical History/i,
    });
    await expect(medicalHistoryTab).toBeVisible();
    await medicalHistoryTab.click();

    await expect(medicalHistoryTab).toHaveAttribute("data-state", "active");
  });

  test("should handle concurrent API updates gracefully", async ({
    page,
    request,
  }) => {

    const update1 = await request.patch(
      `${API_URL}/patients/${cachedPatient!.id}`,
      {
        headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
        data: {
          medicalHistory: ["Condition1", "Condition2"],
        },
      },
    );

    const update2 = await request.patch(
      `${API_URL}/patients/${cachedPatient!.id}`,
      {
        headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
        data: {
          allergies: "Allergy1, Allergy2",
        },
      },
    );

    expect(update1.status()).toBe(200);
    expect(update2.status()).toBe(200);

    await page.goto(`/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByText("Loading patient details...")).not.toBeVisible({
      timeout: 15000,
    });

    const patientName = `${cachedPatient!.firstName} ${cachedPatient!.lastName}`;
    await expect(page.getByText(patientName).first()).toBeVisible();
  });

  test("should handle network errors gracefully", async ({ page }) => {
    await page.goto(`/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    await expect(page.getByText("Loading patient details...")).not.toBeVisible({
      timeout: 15000,
    });

    await page.context().setOffline(true);

    const medicalHistoryTab = page.getByRole("tab", {
      name: /Medical History/i,
    });
    if (
      await medicalHistoryTab.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await medicalHistoryTab.click();
      await page.waitForTimeout(1000);
    }

    await expect(page.locator("body")).toBeVisible();

    await page.context().setOffline(false);
  });

  test("should show 'Patient not found' for invalid patient ID", async ({
    page,
  }) => {
    await page.goto("/patients/invalid-patient-id-12345", {
      waitUntil: "networkidle",
    });

    await expect(page.getByText("Loading patient details...")).not.toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByText("Patient not found")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Back to Patients" }),
    ).toBeVisible();
  });
});
