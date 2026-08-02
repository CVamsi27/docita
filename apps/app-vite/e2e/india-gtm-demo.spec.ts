import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { z } from "zod";
import {
  API_URL,
  loginUser,
  patientDetailPath,
  setupTestUser,
  type UserData,
} from "./utils/patient-helpers";
import {
  expectDashboardQueueSectionReady,
  expectPageHeader,
  expectProtectedWorkspaceLoaded,
  expectRoute,
} from "./utils/ui-contracts";

const idResponseSchema = z.object({ id: z.string() });

/**
 * India-first 90-second demo path (see docs/product/INDIA_FIRST_EXECUTION.md):
 * 1. Review patient data
 * 2. Day-of-visit queue
 * 3. Digital prescription
 * 4. Invoice + follow-up surfaces
 */
test.describe("India GTM demo path", () => {
  let user: UserData;
  let patientId: string;
  let prescriptionId: string;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    user = await setupTestUser(request);

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        "x-docita-e2e": "true",
      },
      data: {
        firstName: "Demo",
        lastName: "Patient",
        phoneNumber: "9876543210",
        gender: "MALE",
        dateOfBirth: "1988-05-15",
        clinicId: user.clinicId,
      },
    });
    expect(patientRes.ok()).toBeTruthy();
    patientId = idResponseSchema.parse(await patientRes.json()).id;

    const startTime = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const endTime = new Date(Date.now() + 50 * 60 * 1000).toISOString();
    const appointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        "x-docita-e2e": "true",
      },
      data: {
        patientId,
        doctorId: user.id,
        clinicId: user.clinicId,
        startTime,
        endTime,
        status: "scheduled",
        type: "consultation",
      },
    });
    expect(appointmentRes.ok()).toBeTruthy();
    const appointmentId = idResponseSchema.parse(await appointmentRes.json()).id;

    const prescriptionRes = await request.post(`${API_URL}/prescriptions`, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        "x-docita-e2e": "true",
      },
      data: {
        patientId,
        doctorId: user.id,
        appointmentId,
        instructions: "Take after meals",
        medications: [
          {
            name: "Paracetamol",
            dosage: "500mg",
            frequency: "Twice daily",
            duration: "5 days",
          },
        ],
      },
    });
    expect(prescriptionRes.ok()).toBeTruthy();
    prescriptionId = idResponseSchema.parse(await prescriptionRes.json()).id;

    const invoiceRes = await request.post(`${API_URL}/invoices`, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        "x-docita-e2e": "true",
      },
      data: {
        patientId,
        total: 1200,
        status: "pending",
        doctorName: "Dr Demo",
        items: [{ description: "Consultation", quantity: 1, price: 1200 }],
      },
    });
    expect(invoiceRes.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ page }: { page: Page }) => {
    await loginUser(page, user);
    await page.goto("/today", { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
  });

  test("walks the four-step founder demo without server errors", async ({
    page,
  }) => {
    // 1. Review existing patient data
    await page.goto("/patients", { waitUntil: "networkidle" });
    await expectRoute(page, /\/patients/);
    await expectPageHeader(page, { title: /Patients/i });
    await expect(page.getByText("Demo Patient").first()).toBeVisible({
      timeout: 30000,
    });

    await page.goto(patientDetailPath(patientId), { waitUntil: "networkidle" });
    await expect(page.getByText("Demo Patient").first()).toBeVisible({
      timeout: 30000,
    });

    // 2. Day-of-visit queue
    await page.goto("/today", { waitUntil: "networkidle" });
    await expectRoute(page, /\/today/);
    await expectDashboardQueueSectionReady(page);

    // 3. Digital prescription
    await page.goto(`/prescriptions/${prescriptionId}`, {
      waitUntil: "networkidle",
    });
    await expect(page).toHaveURL(new RegExp(`/prescriptions/${prescriptionId}`));
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText(/Paracetamol/i).first()).toBeVisible({
      timeout: 30000,
    });

    // 4. Invoice + follow-up communication surfaces
    await page.goto("/invoices", { waitUntil: "networkidle" });
    await expectRoute(page, /\/invoices/);
    await expectPageHeader(page, { title: /Invoices/i });

    await page.goto("/settings/whatsapp-sender", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/settings\/whatsapp-sender/);
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 30000,
    });
  });
});
