import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { API_URL, loginUser, setupTestUser } from "./utils/patient-helpers";
import { expectPageHeader, expectRoute } from "./utils/ui-contracts";

test.describe("WhatsApp Integration", () => {
  let cachedUser: {
    id: string;
    email: string;
    clinicId: string;
    accessToken: string;
    role?: string;
  } | null = null;
  let cachedPatient: { id: string } | null = null;
  let cachedPrescription: { id: string } | null = null;

  test.beforeAll(async ({ request }) => {
    const user = await setupTestUser(request);
    cachedUser = {
      id: user.id,
      email: user.email,
      clinicId: user.clinicId,
      accessToken: user.accessToken,
      role: "ADMIN_DOCTOR",
    };

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${cachedUser.accessToken}`,
        "x-docita-e2e": "true",
      },
      data: {
        firstName: "WA",
        lastName: "User",
        phoneNumber: `91${Date.now().toString().slice(-8)}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: cachedUser.clinicId,
        dpdpConsent: {
          accepted: true,
          noticeVersion: DPDP_NOTICE_VERSION,
          givenByName: "WA User",
        },
      },
    });
    expect(
      patientRes.ok(),
      `patient bootstrap failed: ${patientRes.status()} ${await patientRes.text()}`,
    ).toBeTruthy();
    cachedPatient = await patientRes.json();

    const startTime = new Date();
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
        status: "completed",
        type: "consultation",
      },
    });
    expect(
      aptRes.ok(),
      `appointment bootstrap failed: ${aptRes.status()}`,
    ).toBeTruthy();
    const appointment = await aptRes.json();

    const prescRes = await request.post(`${API_URL}/prescriptions`, {
      headers: { Authorization: `Bearer ${cachedUser!.accessToken}` },
      data: {
        patientId: cachedPatient!.id,
        doctorId: cachedUser!.id,
        clinicId: cachedUser!.clinicId,
        appointmentId: appointment.id,
        medications: [
          {
            name: "Paracetamol",
            dosage: "500mg",
            frequency: "bd",
            duration: "3 days",
          },
        ],
        instructions: "Take after food",
      },
    });
    expect(
      prescRes.ok(),
      `prescription bootstrap failed: ${prescRes.status()}`,
    ).toBeTruthy();
    cachedPrescription = await prescRes.json();
  });

  async function injectAuth(page: Page) {
    if (!cachedUser) return;
    await loginUser(page, cachedUser, {
      role: cachedUser.role ?? "ADMIN_DOCTOR",
    });
  }

  test("should render WhatsApp page header and primary actions", async ({
    page,
  }) => {
    await injectAuth(page);
    await page.goto("/whatsapp");
    await page.waitForLoadState("networkidle");

    await expectRoute(page, /\/whatsapp/);
    await expectPageHeader(page, {
      title: "WhatsApp",
      description: /Patient conversations/i,
    });

    await expect(
      page.getByRole("link", { name: /Sender settings/i }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /Campaigns/i })).toBeVisible();
  });

  test("should trigger WhatsApp API when sending prescription", async ({
    page,
  }) => {
    await injectAuth(page);

    let whatsappCalled = false;
    await page.route("**/whatsapp/resend-prescription/*", async (route) => {
      whatsappCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, messageId: "mock-wa-id" }),
      });
    });

    expect(
      cachedPrescription?.id,
      "prescription bootstrap did not yield an id",
    ).toBeTruthy();

    await page.goto(`/prescriptions/${cachedPrescription!.id}`, {
      waitUntil: "load",
    });

    const waButton = page.getByRole("button", { name: "Send", exact: true });
    await expect(waButton).toBeVisible({ timeout: 15000 });
    await waButton.click();

    const confirmBtn = page
      .locator('button:has-text("Send"), button:has-text("Confirm")')
      .first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    await expect.poll(() => whatsappCalled, { timeout: 5000 }).toBe(true);
  });
});
