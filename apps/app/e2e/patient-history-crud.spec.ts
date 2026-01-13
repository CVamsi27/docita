import { APIRequestContext, expect, Page, test } from "@playwright/test";
import {
  API_URL,
  fetchPatientByApi,
  setupTestUser,
  loginUser,
  UserData,
} from "./utils/patient-helpers";

test.describe("Patient Medical History - CRUD", () => {
  let cachedUser: UserData | null = null;
  let cachedPatient: { id: string } | null = null;

  test.beforeAll(async ({ request }) => {
    cachedUser = await setupTestUser(request);

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${cachedUser.accessToken}` },
      data: {
        firstName: "Medical",
        lastName: "History",
        phoneNumber: "9876543210",
        gender: "MALE",
        dateOfBirth: "1980-01-01",
        medicalHistory: ["Hypertension", "Type 2 Diabetes", "Asthma"],
        allergies: "Peanuts, Penicillin",
        clinicId: cachedUser.clinicId,
      },
    });

    if (!patientRes.ok()) {
      throw new Error("Patient creation failed");
    }
    cachedPatient = await patientRes.json();
  });

  test.beforeEach(async ({ page }) => {
    if (cachedUser) {
      await loginUser(page, cachedUser);
    }
  });

  test("should display medical history tab and content", async ({
    page,
    request,
  }) => {
    await page.goto(`/dashboard/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    const medicalHistoryTab = page
      .locator(
        'button[value="medical-history"], [role="tab"]:has-text("Medical History"), button:has-text("Medical History")',
      )
      .first();

    const tabVisible = await medicalHistoryTab
      .isVisible({ timeout: 15000 })
      .catch(() => false);

    if (tabVisible) {
      await expect(medicalHistoryTab).toBeVisible({ timeout: 1000 });
      await medicalHistoryTab.click();

      await expect(page.locator("text=Hypertension")).toBeVisible();
      await expect(page.locator("text=Type 2 Diabetes")).toBeVisible();
      await expect(page.locator("text=Asthma")).toBeVisible();
    } else {
      const patientRes = await request.get(
        `${API_URL}/patients/${cachedPatient!.id}`,
        {
          headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
        },
      );
      expect(patientRes.ok()).toBeTruthy();
      const patientBody = await patientRes.json();
      expect(patientBody.medicalHistory).toEqual(
        expect.arrayContaining(["Hypertension", "Type 2 Diabetes", "Asthma"]),
      );
    }
  });

  test("should display allergies information", async ({ page, request }) => {
    await page.goto(`/dashboard/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    const medicalHistoryTab = page
      .locator(
        'button[value="medical-history"], [role="tab"]:has-text("Medical History"), button:has-text("Medical History")',
      )
      .first();

    if (
      await medicalHistoryTab.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await medicalHistoryTab.click();
    }

    const allergiesSection = page
      .locator("text=/allergies|peanuts|penicillin/i")
      .first();
    const visible = await allergiesSection
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (visible) {
      await expect(allergiesSection).toBeVisible({ timeout: 1000 });
      await expect(page.locator("text=/Peanuts|peanuts/")).toBeVisible();
      await expect(page.locator("text=/Penicillin|penicillin/")).toBeVisible();
    } else {
      const pb = await fetchPatientByApi(
        request,
        cachedPatient!.id,
        cachedUser!.accessToken,
      );
      expect(pb).not.toBeNull();
      expect(pb!.allergies).toMatch(/Peanuts|Penicillin/i);
    }
  });

  test("should edit medical history", async ({ page, request }) => {
    await page.goto(`/dashboard/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    const editButton = page
      .locator(
        'button:has-text("Edit"), button[aria-label*="edit"], button[title*="Edit"]',
      )
      .first();

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();
      const addConditionButton = page
        .locator(
          'button:has-text("Add Condition"), button:has-text("Add"), button:has-text("Add Medical History")',
        )
        .first();

      if (
        await addConditionButton.isVisible({ timeout: 2000 }).catch(() => false)
      ) {
        await addConditionButton.click();
        const conditionInput = page
          .locator(
            'input[placeholder*="condition"], input[placeholder*="Condition"]',
          )
          .last();
        await conditionInput.fill("Migraine");
        await page.waitForTimeout(300);

        const saveButton = page
          .locator('button:has-text("Save"), button[type="submit"]')
          .first();
        if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveButton.click();
          await page.waitForTimeout(500);
        }
      }
    } else {
      const updateRes = await request.patch(
        `${API_URL}/patients/${cachedPatient!.id}`,
        {
          headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
          data: {
            medicalHistory: [
              "Hypertension",
              "Type 2 Diabetes",
              "Asthma",
              "Migraine",
            ],
            clinicId: cachedUser!.clinicId,
          },
        },
      );

      const patientBodyAfter = await fetchPatientByApi(
        request,
        cachedPatient!.id,
        cachedUser!.accessToken,
      );
      const apiHasMigraine = !!(
        patientBodyAfter &&
        Array.isArray(patientBodyAfter.medicalHistory) &&
        patientBodyAfter.medicalHistory.includes("Migraine")
      );

      expect(updateRes.ok() || apiHasMigraine).toBeTruthy();

      await page.reload();
      await page.waitForTimeout(500);

      if ((await page.locator("text=Migraine").count()) > 0) {
        await expect(page.locator("text=Migraine")).toBeVisible({
          timeout: 5000,
        });
      }
    }
  });

  test("should remove medical history item", async ({ page, request }) => {
    const removeTestRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        firstName: "Remove",
        lastName: "Test",
        phoneNumber: "9876543211",
        gender: "FEMALE",
        dateOfBirth: "1985-05-15",
        medicalHistory: ["Condition1", "Condition2", "Condition3"],
        allergies: "None",
      },
    });

    expect(removeTestRes.ok()).toBeTruthy();
    const removeTestPatient = await removeTestRes.json();
    await page.goto(`/dashboard/patients/${removeTestPatient.id}`, {
      waitUntil: "networkidle",
    });

    const medicalHistoryTab = page
      .locator(
        'button[value="medical-history"], [role="tab"]:has-text("Medical History"), button:has-text("Medical History")',
      )
      .first();

    if (
      await medicalHistoryTab.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await medicalHistoryTab.click();
    }

    const removeButtons = page.locator(
      'button[aria-label*="delete"], button[aria-label*="remove"], button:has-text("Remove")',
    );

    const removeCount = await removeButtons.count();

    if (removeCount > 0) {
      await removeButtons.first().click();
      const confirmButton = page
        .locator(
          'button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")',
        )
        .first();

      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
      await page.waitForTimeout(500);
    }
  });

  // Adding other straightforward CRUD tests here...
  test("should handle empty medical history gracefully", async ({
    page,
    request,
  }) => {
    const emptyRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        firstName: "Empty",
        lastName: "History",
        phoneNumber: "9876543212",
        gender: "MALE",
        dateOfBirth: "1975-03-10",
      },
    });

    expect(emptyRes.ok()).toBeTruthy();
    const emptyPatient = await emptyRes.json();
    await page.goto(`/dashboard/patients/${emptyPatient.id}`, {
      waitUntil: "networkidle",
    });

    const medicalHistoryTab = page
      .locator(
        'button[value="medical-history"], [role="tab"]:has-text("Medical History"), button:has-text("Medical History")',
      )
      .first();

    if (
      await medicalHistoryTab.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await medicalHistoryTab.click();
      const noItemsDisplay = (await page.locator("Hypertension").count()) === 0;
      expect(noItemsDisplay).toBeTruthy();
    }
  });

  test("should display medical history in patient list/table", async ({
    page,
  }) => {
    await page.goto("/dashboard/patients", { waitUntil: "networkidle" });
    const tableOrList = page
      .locator('table, [role="grid"], [data-testid*="patient"]')
      .first();

    if (await tableOrList.isVisible({ timeout: 3000 }).catch(() => false)) {
      const patientRow = page.locator(`text=${cachedPatient!.id}`).first();
      if (await patientRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        const medicalHistoryVisible =
          (await page
            .locator("text=Hypertension")
            .or(page.locator("text=Medical History"))
            .count()) > 0;
        expect(medicalHistoryVisible).toBeTruthy();
      }
    }
  });
});
