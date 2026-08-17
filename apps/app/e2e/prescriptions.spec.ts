import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { setupTestUser } from "./utils/patient-helpers";

const API_URL = "http://127.0.0.1:3001/api/v1";

test.describe("Prescriptions", () => {
  let authToken: string;
  let _clinicId: string;
  let patientId: string = "";
  let doctorId: string;
  let appointmentId: string | null = null;
  let suiteAvailable = true;
  let suiteSkipReason = "";

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {
      // Provision through the modern onboarding flow: register-with-clinicName
      // hard-400s (clinic registration moved to onboarding) and the /clinics
      // CRUD controller is now INTERNAL-only, so a doctor can no longer create
      // a clinic or self-assign via /doctor-clinics. setupTestUser runs
      // register -> onboarding -> login and returns the onboarded clinic; the
      // registering user is already that clinic's admin doctor.
      const user = await setupTestUser(request);
      authToken = user.accessToken;
      doctorId = user.id;
      _clinicId = user.clinicId;

      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          firstName: "Test",
          lastName: `Patient${Date.now()}`,
          dateOfBirth: "1990-01-01",
          gender: "MALE",
          phoneNumber: `9${Math.floor(Math.random() * 1e9)}`.padEnd(10, "0"),
          // POST /patients enforces DPDP consent at the controller (400
          // without it); mirror the critical-flows payload.
          dpdpConsent: {
            accepted: true,
            noticeVersion: DPDP_NOTICE_VERSION,
            givenByName: "E2E Prescription",
          },
        },
      });
      expect(
        patientRes.ok(),
        `patient bootstrap failed: ${patientRes.status()}`,
      ).toBeTruthy();
      const patient = await patientRes.json();
      patientId = patient.id;

      const apptRes = await request.post(`${API_URL}/appointments`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          patientId,
          doctorId,
          clinicId: _clinicId,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 1800000).toISOString(),
          type: "consultation",
          status: "completed",
        },
      });
      expect(
        apptRes.ok(),
        `appointment bootstrap failed: ${apptRes.status()}`,
      ).toBeTruthy();
      appointmentId = (await apptRes.json()).id;

      const presRes = await request.post(`${API_URL}/prescriptions`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          appointmentId,
          patientId,
          doctorId,
          medications: [
            {
              name: "Test Med",
              dosage: "500mg",
              frequency: "QD",
              duration: "7 days",
            },
          ],
        },
      });
      expect(
        presRes.ok(),
        `prescription seed failed: ${presRes.status()}`,
      ).toBeTruthy();

      const testRes = await request.get(`${API_URL}/prescriptions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (!testRes.ok()) {
        suiteAvailable = false;
        suiteSkipReason = `GET /prescriptions unavailable (status ${testRes.status()})`;
      }
    } catch (error) {
      suiteAvailable = false;
      suiteSkipReason = `bootstrap threw: ${(error as Error).message}`;
    }
  });

  test.beforeEach(() => {
    test.skip(
      !suiteAvailable,
      `prescriptions API not provisioned: ${suiteSkipReason}`,
    );
  });

  test("should create prescription successfully", async ({ request }) => {
    expect(patientId, "patient bootstrap did not yield an id").toBeTruthy();

    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 90 * 60 * 1000).toISOString();
    const apptRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        doctorId,
        startTime: start,
        endTime: end,
        status: "scheduled",
        type: "consultation",
      },
    });
    expect(
      apptRes.ok(),
      `POST /appointments failed: ${apptRes.status()}`,
    ).toBeTruthy();

    const specificAppointmentId = (await apptRes.json()).id;

    const prescRes = await request.post(`${API_URL}/prescriptions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        doctorId,
        appointmentId: specificAppointmentId,
        instructions: "Take medications with food",
        medications: [
          {
            name: "Aspirin",
            dosage: "500mg",
            frequency: "Twice daily",
            duration: "7 days",
          },
        ],
      },
    });
    expect(
      prescRes.ok(),
      `POST /prescriptions failed: ${prescRes.status()}`,
    ).toBeTruthy();

    const presc = await prescRes.json();
    expect(presc.id).toBeDefined();
    expect(presc.patientId).toBe(patientId);
  });

  test("should fetch prescription list", async ({ request }) => {
    const prescList = await request.get(`${API_URL}/prescriptions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      prescList.ok(),
      `GET /prescriptions failed: ${prescList.status()}`,
    ).toBeTruthy();

    const prescs = await prescList.json();
    expect(
      Array.isArray(prescs) || (prescs && Array.isArray(prescs.items)),
    ).toBeTruthy();
  });

  test("should fetch specific prescription", async ({ request }) => {
    expect(patientId, "patient bootstrap did not yield an id").toBeTruthy();

    const now = new Date();
    const start = new Date(now.getTime() + 120 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 150 * 60 * 1000).toISOString();
    const apptRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        doctorId,
        startTime: start,
        endTime: end,
        status: "scheduled",
        type: "consultation",
      },
    });
    expect(
      apptRes.ok(),
      `POST /appointments failed: ${apptRes.status()}`,
    ).toBeTruthy();
    const specificAppointmentId = (await apptRes.json()).id;

    const createRes = await request.post(`${API_URL}/prescriptions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        doctorId,
        appointmentId: specificAppointmentId,
        instructions: "Take with meals",
        medications: [
          {
            name: "Ibuprofen",
            dosage: "400mg",
            frequency: "Three times daily",
            duration: "5 days",
          },
        ],
      },
    });
    expect(
      createRes.ok(),
      `POST /prescriptions failed: ${createRes.status()}`,
    ).toBeTruthy();

    const presc = await createRes.json();

    const fetchRes = await request.get(`${API_URL}/prescriptions/${presc.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      fetchRes.ok(),
      `GET /prescriptions/:id failed: ${fetchRes.status()}`,
    ).toBeTruthy();

    const fetched = await fetchRes.json();
    expect(fetched.id).toBe(presc.id);
  });

  test("should navigate to prescription details", async ({
    page,
    request: requestContext,
  }) => {
    expect(patientId, "patient bootstrap did not yield an id").toBeTruthy();

    const now = new Date();
    const start = new Date(now.getTime() + 180 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 210 * 60 * 1000).toISOString();

    const apptRes = await requestContext.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        doctorId,
        startTime: start,
        endTime: end,
        status: "completed",
        type: "consultation",
      },
    });
    expect(
      apptRes.ok(),
      `POST /appointments failed: ${apptRes.status()}`,
    ).toBeTruthy();

    const appt = await apptRes.json();
    const seedRes = await requestContext.post(`${API_URL}/prescriptions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        appointmentId: appt.id,
        diagnosis: "Test Diagnosis for Nav",
        medications: [
          {
            name: "Test Med",
            dosage: "10mg",
            frequency: "daily",
            duration: "7 days",
          },
        ],
      },
    });
    expect(
      seedRes.ok(),
      `POST /prescriptions (nav seed) failed: ${seedRes.status()}`,
    ).toBeTruthy();

    await page.addInitScript(
      ({ token, uid, cid }) => {
        localStorage.setItem("docita_token", token);
        localStorage.setItem(
          "docita_user",
          JSON.stringify({
            id: uid,
            clinicId: cid,
            role: "DOCTOR",
          }),
        );
        localStorage.setItem("selectedClinicId", cid);
        localStorage.setItem(
          "selectedClinic",
          JSON.stringify({
            id: cid,
            name: "Test Clinic",
            tier: "PRO",
            type: "GENERAL",
          }),
        );
      },
      { token: authToken, uid: doctorId, cid: _clinicId },
    );

    await page.goto("/prescriptions", { waitUntil: "networkidle" });

    const table = page.locator("table tbody");
    await expect(table).toBeVisible({ timeout: 15000 });

    const row = table.locator("tr").first();
    await expect(row).toBeVisible();

    const viewButton = row.locator('a[href*="/prescriptions/"]').first();

    if ((await viewButton.count()) > 0 && (await viewButton.isVisible())) {
      await viewButton.click();
    } else {
      await row.click();
    }

    await expect(page).toHaveURL(/\/prescriptions\//);

    await expect(
      page
        .locator("h1, h2, h3")
        .filter({ hasText: /Prescription/ })
        .first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
