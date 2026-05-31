import { expect, test } from "@playwright/test";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { PROTECTED_STATIC_MOBILE_ROUTES } from "./mobile-route-matrix";
import {
  API_URL,
  loginUser,
  patientDetailPath,
  reuseSharedGeneralClinicUser,
} from "./utils/patient-helpers";
import {
  expectMobileWorkspaceChrome,
  expectNoHorizontalOverflow,
} from "./utils/mobile-layout";
import {
  expectConsultationWorkspaceReady,
  expectProtectedWorkspaceLoaded,
} from "./utils/ui-contracts";

test.describe("Mobile protected routes", () => {
  let user: Awaited<ReturnType<typeof reuseSharedGeneralClinicUser>> | null =
    null;
  let patientId: string | null = null;
  let appointmentId: string | null = null;
  let invoiceId: string | null = null;
  let prescriptionId: string | null = null;

  test.beforeAll(async ({ request }) => {
    user = await reuseSharedGeneralClinicUser(request);
    if (!user) {
      throw new Error("Failed to initialize shared clinic user");
    }

    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        firstName: "Mobile",
        lastName: "Patient",
        phoneNumber: `98${Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, "0")}`,
        gender: "MALE",
        dateOfBirth: "1990-01-01",
        clinicId: user.clinicId,
        dpdpConsent: {
          accepted: true,
          noticeVersion: DPDP_NOTICE_VERSION,
          givenByName: "Mobile Patient",
        },
      },
    });
    expect(patientRes.ok()).toBeTruthy();
    const patient = await patientRes.json();
    patientId = patient.id as string;

    const start = new Date();
    start.setMinutes(start.getMinutes() + 20);
    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 30);

    const apptRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        patientId,
        doctorId: user.id,
        clinicId: user.clinicId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        type: "consultation",
        status: "scheduled",
      },
    });
    expect(apptRes.ok()).toBeTruthy();
    const appointment = await apptRes.json();
    appointmentId = appointment.id as string;

    const startRes = await request.post(
      `${API_URL}/appointments/${appointmentId}/start-consultation`,
      {
        headers: { Authorization: `Bearer ${user.accessToken}` },
      },
    );
    expect(startRes.ok()).toBeTruthy();

    const invoiceRes = await request.post(`${API_URL}/invoices`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        patientId,
        total: 1500,
        status: "pending",
        items: [
          {
            description: "Mobile E2E consultation",
            quantity: 1,
            price: 1500,
          },
        ],
      },
    });
    if (invoiceRes.ok()) {
      const invoice = await invoiceRes.json();
      invoiceId = invoice.id as string;
    }

    const prescriptionRes = await request.get(`${API_URL}/prescriptions`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    if (prescriptionRes.ok()) {
      const body = await prescriptionRes.json();
      const items = Array.isArray(body)
        ? body
        : Array.isArray(body.items)
          ? body.items
          : [];
      if (items[0]?.id) {
        prescriptionId = items[0].id as string;
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    if (!user) throw new Error("User not initialized");
    await loginUser(page, user);
  });

  async function visitProtectedRoute(
    page: import("@playwright/test").Page,
    path: string,
  ) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expectProtectedWorkspaceLoaded(page);
    await expectNoHorizontalOverflow(page);
  }

  test("mobile header exposes search, quick-add, and command palette on /today", async ({
    page,
  }) => {
    await visitProtectedRoute(page, "/today");
    await expectMobileWorkspaceChrome(page);
  });

  for (const route of PROTECTED_STATIC_MOBILE_ROUTES) {
    test(`no horizontal overflow on ${route.label} (${route.path})`, async ({
      page,
    }) => {
      await visitProtectedRoute(page, route.path);
    });
  }

  test("patient detail tabs render without page overflow", async ({ page }) => {
    if (!patientId) throw new Error("Patient fixture missing");
    await visitProtectedRoute(page, patientDetailPath(patientId));
    await expect(page.getByRole("tablist").first()).toBeVisible();
  });

  test("consultation detail renders without page overflow", async ({ page }) => {
    test.setTimeout(180_000);
    if (!appointmentId) throw new Error("Appointment fixture missing");
    await page.goto(`/consultation/${appointmentId}`, {
      waitUntil: "domcontentloaded",
    });
    await expectProtectedWorkspaceLoaded(page);
    await expectConsultationWorkspaceReady(page);
    await expectNoHorizontalOverflow(page);
  });

  test("invoice detail renders without page overflow", async ({ page }) => {
    if (!invoiceId) {
      test.skip(true, "Invoice API fixture unavailable");
    }
    await visitProtectedRoute(page, `/invoices/${invoiceId}`);
  });

  test("prescription detail renders without page overflow", async ({ page }) => {
    if (!prescriptionId) {
      test.skip(true, "No prescription available for detail route");
    }
    await visitProtectedRoute(page, `/prescriptions/${prescriptionId}`);
  });

});
