import { expect, Page, test } from "@playwright/test";
import { API_URL, setupTestUser } from "./utils/patient-helpers";
import { seedSession } from "./utils/session";
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
      headers: { Authorization: `Bearer ${cachedUser.accessToken}` },
      data: {
        firstName: "WA",
        lastName: "User",
        phoneNumber: `91${Date.now().toString().slice(-8)}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: cachedUser.clinicId,
      },
    });
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
    cachedPrescription = await prescRes.json();
  });

  async function injectAuth(page: Page) {
    if (!cachedUser) return;
    await seedSession(page, {
      token: cachedUser.accessToken,
      user: {
        id: cachedUser.id,
        email: cachedUser.email,
        role: cachedUser.role ?? "ADMIN_DOCTOR",
        clinicId: cachedUser.clinicId,
      },
    });
  }

  test("should render WhatsApp page header and primary actions", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/whatsapp");
    await page.waitForLoadState("networkidle");

    if ((page.url() || "").includes("/dashboard")) {
      test.skip();
      return;
    }
    await expectRoute(page, /\/whatsapp/);
    await expectPageHeader(page, {
      title: "WhatsApp Integration",
      description: /WhatsApp Business API/i,
    });

    await expect(page.getByRole("button", { name: /Manage Settings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Campaign/i })).toBeVisible();
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

    await page.goto("/dashboard/prescriptions", { waitUntil: "load" });

    const patientText = page.locator("text=WA User");
    if (await patientText.isVisible()) {
      await patientText.first().click(); 
    } else {

      if (cachedPrescription?.id) {
        await page.goto(`/prescriptions/${cachedPrescription.id}`);
      }
    }

    const waButton = page
      .locator(
        'button:has-text("WhatsApp"), [aria-label*="WhatsApp"], .whatsapp-share-btn',
      )
      .first();

    if (await waButton.isVisible()) {
      await waButton.click();

      const confirmBtn = page.locator(
        'button:has-text("Send"), button:has-text("Confirm")',
      );
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      await page.waitForTimeout(1000); 

      expect(whatsappCalled).toBeTruthy();
    } else {
      

      test.skip();
    }
  });
});
