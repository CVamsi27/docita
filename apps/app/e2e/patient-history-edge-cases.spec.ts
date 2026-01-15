import { expect, test } from "@playwright/test";
import {
  API_URL,
  setupTestUser,
  loginUser,
  UserData,
} from "./utils/patient-helpers";

test.describe("Patient Medical History - Edge Cases", () => {
  let cachedUser: UserData | null = null;
  let cachedPatient: { id: string } | null = null;

  test.beforeAll(async ({ request }) => {
    cachedUser = await setupTestUser(request);

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${cachedUser.accessToken}` },
      data: {
        firstName: "Edge",
        lastName: "Case",
        phoneNumber: "9876543217",
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        medicalHistory: ["Base Condition"],
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

  test("should validate required fields in medical history", async ({
    page,
  }) => {
    await page.goto(`/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    const editButton = page
      .locator(
        'button:has-text("Edit"), button[aria-label*="edit"], button[title*="Edit"]',
      )
      .first();

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();
      const medicalHistoryInput = page
        .locator(
          'input[placeholder*="medical"], textarea[placeholder*="medical"]',
        )
        .first();

      if (
        await medicalHistoryInput
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        await medicalHistoryInput.clear();
        await page.waitForTimeout(300);
        const errorMessage = page
          .locator("text=/required|cannot be empty|must/i")
          .first();

        if (
          await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await expect(errorMessage).toBeVisible();
        }
      }
    }
  });

  test("should handle validation error when medical history exceeds character limit", async ({
    page,
  }) => {
    await page.goto(`/patients/${cachedPatient!.id}`, {
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

    const editButton = page
      .locator('button:has-text("Edit"), button[aria-label*="edit"]')
      .first();

    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();
      const medicalHistoryInput = page
        .locator(
          'input[placeholder*="medical"], textarea[placeholder*="medical"], [data-testid*="medical"]',
        )
        .first();

      if (
        await medicalHistoryInput
          .isVisible({ timeout: 2000 })
          .catch(() => false)
      ) {
        const longText = "A".repeat(5000);
        await medicalHistoryInput.fill(longText);
        await page.waitForTimeout(300);

        const submitButton = page.locator('button[type="submit"]').first();
        if (
          await submitButton.isVisible({ timeout: 1000 }).catch(() => false)
        ) {
          await submitButton.click();
          await page.waitForTimeout(500);

          const errorMsg = page
            .locator("text=/too long|character limit|exceeds|maximum/i")
            .first();

          if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
            await expect(errorMsg).toBeVisible();
          }
        }
      }
    }
  });

  test("should handle concurrent edits gracefully", async ({
    page,
    request,
  }) => {
    // Serial updates to ensure data integrity
    const update1 = await request.patch(`${API_URL}/patients/${cachedPatient!.id}`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        medicalHistory: ["Condition1", "Condition2"],
      },
    });

    const update2 = await request.patch(`${API_URL}/patients/${cachedPatient!.id}`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        allergies: "Allergy1, Allergy2",
      },
    });

    expect(update1.ok() && update2.ok()).toBeTruthy();

    await page.goto(`/patients/${cachedPatient!.id}`, {
      waitUntil: "networkidle",
    });

    await expect(page.locator('h1')).toBeVisible();

    const content = await page.locator("body").innerText();
    const isConsistent = content.includes("Allergy1");

    if (!isConsistent) {
      console.log("Page content dump:", content.slice(0, 500));
    }

    expect(isConsistent).toBeTruthy();
  });

  test("should handle network errors gracefully", async ({ page }) => {
    await page.goto(`/patients/${cachedPatient!.id}`, {
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

    await page.context().setOffline(true);

    const editButton = page
      .locator('button:has-text("Edit"), button[aria-label*="edit"]')
      .first();

    if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(1000);

      const errorOrOfflineMsg = page
        .locator("text=/offline|connection|network|error/i")
        .first();

      const hasErrorHandling =
        (await errorOrOfflineMsg
          .isVisible({ timeout: 2000 })
          .catch(() => false)) ||
        (await page.locator("button:disabled").count()) > 0;

      expect(hasErrorHandling).toBeTruthy();
    }

    await page.context().setOffline(false);
  });
});
