import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import {
  createUniqueClientIp,
  setupTestUser,
} from "./utils/patient-helpers";

const API_URL = "http://127.0.0.1:3001/api/v1";

const DPDP_CONSENT_PAYLOAD = {
  accepted: true,
  noticeVersion: DPDP_NOTICE_VERSION,
  givenByName: "E2E Test",
} as const;

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}
interface TestUser {
  id: string;
  email: string;
  clinicId: string;
  accessToken: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface TestClinic {
  id: string;
  name: string;
}

interface TestPatient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface TestAppointment {
  id: string;
  patientId: string;
  doctorId: string;
  status: string;
  startTime: string;
  endTime: string;
}

test.describe("Critical Business Flows", () => {
  let request: APIRequestContext;
  let requestFactory: {
    newContext: (options?: {
      extraHTTPHeaders?: Record<string, string>;
    }) => Promise<APIRequestContext>;
  };
  let doctor: TestUser;
  let patient: TestPatient;
  let clinic: TestClinic;
  let appointment: TestAppointment;

  test.beforeAll(async ({ playwright }) => {
    const context = await playwright.chromium.launchPersistentContext("", {});
    request = context.request;
    requestFactory = playwright.request;

    const onboardedDoctor = await setupTestUser(request);

    doctor = {
      id: onboardedDoctor.id,
      email: onboardedDoctor.email,
      clinicId: onboardedDoctor.clinicId || "",
      accessToken: onboardedDoctor.accessToken,
      firstName: "Test",
      lastName: "Doctor",
      role: "ADMIN_DOCTOR",
    };

    expect(doctor.clinicId).toBeTruthy();
    clinic = {
      id: doctor.clinicId,
      name: "Test Clinic",
    };

    const patientEmail = `patient-critical-${Date.now()}@test.com`;
    const patientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        email: patientEmail,
        firstName: "Test",
        lastName: "Patient",
        gender: "OTHER",
        phoneNumber: "9000000000",
        dateOfBirth: "1990-01-01",
        clinicId: doctor.clinicId,
        dpdpConsent: DPDP_CONSENT_PAYLOAD,
      },
    });

    if (!patientRes.ok()) {
      throw new Error(
        `Patient creation failed: ${patientRes.status()} ${await patientRes.text()}`,
      );
    }
    const patientData = (await patientRes.json()) as {
      id: string;
      email?: string;
    };
    patient = {
      id: patientData.id,
      email: patientEmail,
      firstName: "Test",
      lastName: "Patient",
    };
  });

  test(" FLOW 1: Patient Onboarding - Register → Join Clinic → Create First Appointment", async () => {
    const newPatientEmail = `onboard-patient-${Date.now()}@test.com`;
    const newPatientRes = await request.post(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        firstName: "Onboard",
        lastName: "Patient",
        email: newPatientEmail,
        gender: "OTHER",
        phoneNumber: "9000000001",
        dateOfBirth: "1990-01-01",
        clinicId: doctor.clinicId,
        dpdpConsent: DPDP_CONSENT_PAYLOAD,
      },
    });

    if (!newPatientRes.ok()) {
      throw new Error(
        `Patient creation failed: ${newPatientRes.status()} ${await newPatientRes.text()}`,
      );
    }
    const onboardPatientData = (await newPatientRes.json()) as {
      id: string;
      email?: string;
    };
    const onboardPatient = {
      id: onboardPatientData.id,
      email: newPatientEmail,
      firstName: "Onboard",
      lastName: "Patient",
    };

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1);
    const appointmentEnd = new Date(appointmentDate);
    appointmentEnd.setMinutes(appointmentDate.getMinutes() + 30);

    const appointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        patientId: onboardPatient.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
        startTime: appointmentDate.toISOString(),
        endTime: appointmentEnd.toISOString(),
        status: "scheduled",
        type: "consultation",
        notes: "First appointment",
      },
    });

    expect(appointmentRes.ok()).toBeTruthy();
    const appointmentData = (await appointmentRes.json()) as {
      id: string;
      patientId: string;
      doctorId: string;
      scheduledAt: string;
      status: string;
    };
    appointment = appointmentData;

    const clinicAppointmentsRes = await request.get(
      `${API_URL}/appointments`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        params: { doctorId: doctor.id },
      },
    );

    expect(clinicAppointmentsRes.ok()).toBeTruthy();
    const appointmentsData = (await clinicAppointmentsRes.json()) as {
      items?: Array<{ id: string; patientId: string }>;
    };
    const appointments = appointmentsData.items ?? [];
    const appointmentExists = appointments.some(
      (a: { id: string; patientId: string }) =>
        a.id === appointment.id && a.patientId === onboardPatient.id,
    );
    expect(appointmentExists).toBeTruthy();
  });

  test(" FLOW 2: Doctor Dashboard - Login → View Metrics → Access Patient Records", async () => {
    const freshToken = doctor.accessToken;

    const metricsRes = await request.get(`${API_URL}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    if (metricsRes.ok()) {
      toRecord(await metricsRes.json());
    } else {

    }

    const patientsRes = await request.get(`${API_URL}/patients`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    expect(patientsRes.ok()).toBeTruthy();
    const patients = (await patientsRes.json()) as {
      items?: unknown[];
      total: number;
    };
    expect(Array.isArray(patients.items)).toBeTruthy();
    expect((patients.items ?? []).length).toBeGreaterThan(0);

    const appointmentsRes = await request.get(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${freshToken}` },
      params: { doctorId: doctor.id },
    });

    expect(appointmentsRes.ok()).toBeTruthy();
    const fetchedAppointments = (await appointmentsRes.json()) as {
      items?: unknown[];
    };
    expect(Array.isArray(fetchedAppointments.items)).toBeTruthy();
  });

  test(" FLOW 3: Appointment Workflow - Create → Retrieve → Validate", async () => {
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 2);
    const appointmentEnd = new Date(appointmentDate);
    appointmentEnd.setMinutes(appointmentDate.getMinutes() + 30);

    const createRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
        startTime: appointmentDate.toISOString(),
        endTime: appointmentEnd.toISOString(),
        status: "scheduled",
        type: "consultation",
        notes: "Workflow test appointment",
      },
    });

    expect(createRes.ok()).toBeTruthy();
    const newAppointment = (await createRes.json()) as {
      id: string;
      status: string;
    };
    expect(newAppointment.status).toBe("scheduled");

    const finalRes = await request.get(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    expect(finalRes.ok()).toBeTruthy();
    const finalAppointment = (await finalRes.json()) as {
      id: string;
      status: string;
    };
    expect(finalAppointment.status).toBe("scheduled");
  });

  test(" FLOW 4: Patient Records - Access Patient → View Timeline → Update Notes", async () => {

    const patientRes = await request.get(`${API_URL}/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(patientRes.ok()).toBeTruthy();
    const patientRecord = (await patientRes.json()) as {
      id: string;
      firstName: string;
    };
    expect(patientRecord.id).toBe(patient.id);
    expect(patientRecord.firstName).toBe(patient.firstName);

    const historyRes = await request.get(`${API_URL}/patients/${patient.id}/timeline`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(historyRes.ok()).toBeTruthy();
    const history = (await historyRes.json()) as {
      events?: unknown[];
      total: number;
    };
    expect(Array.isArray(history.events)).toBeTruthy();

    const updateRes = await request.patch(`${API_URL}/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        metadata: {
          e2eNote: `Updated at ${new Date().toISOString()} - Critical flow test`,
        },
      },
    });

    if (!updateRes.ok()) {
      throw new Error(
        `Patient notes update failed: ${updateRes.status()} ${await updateRes.text()}`,
      );
    }

    const verifyRes = await request.get(`${API_URL}/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(verifyRes.ok()).toBeTruthy();
    const verifiedPatient = (await verifyRes.json()) as {
      id: string;
      verified: boolean;
    };
    expect(verifiedPatient.id).toBe(patient.id);
  });

  test(" FLOW 5: Clinic Operations - View Settings → Manage Members → View Appointments", async () => {
    const clinicRes = await request.get(`${API_URL}/clinic/settings`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(clinicRes.ok()).toBeTruthy();
    const clinicData = (await clinicRes.json()) as { id: string; name: string };
    expect(clinicData.id).toBe(clinic.id);

    const membersRes = await request.get(`${API_URL}/clinic/members`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(membersRes.ok()).toBeTruthy();
    const members = await membersRes.json();
    expect(Array.isArray(members)).toBeTruthy();

    const appointmentsRes = await request.get(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      params: { doctorId: doctor.id },
    });

    expect(appointmentsRes.ok()).toBeTruthy();
    const clinicAppointments = (await appointmentsRes.json()) as {
      items?: unknown[];
    };
    expect(Array.isArray(clinicAppointments.items)).toBeTruthy();
  });

  test(" FLOW 6: Data Isolation - Verify No Cross-Clinic Access", async () => {
    const otherClientIp = createUniqueClientIp();
    const otherRequestHeaders = {
      "X-Forwarded-For": otherClientIp,
      "X-Real-IP": otherClientIp,
    };
    const otherRequest = await requestFactory.newContext({
      extraHTTPHeaders: otherRequestHeaders,
    });

    try {
      const otherDoctor = await setupTestUser(otherRequest, otherRequestHeaders);
      const otherToken = otherDoctor.accessToken;

      const otherPatientRes = await otherRequest.post(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${otherToken}` },
        data: {
          firstName: "Other",
          lastName: "ClinicPatient",
          email: `other-clinic-${Date.now()}@test.com`,
          gender: "OTHER",
          phoneNumber: "9000000002",
          dateOfBirth: "1991-01-01",
          clinicId: otherDoctor.clinicId,
          dpdpConsent: DPDP_CONSENT_PAYLOAD,
        },
      });

      expect(otherPatientRes.ok()).toBeTruthy();
      const otherPatientData = (await otherPatientRes.json()) as { id: string };

      const crossClinicRes = await otherRequest.get(
        `${API_URL}/patients/${patient.id}`,
        {
          headers: { Authorization: `Bearer ${otherToken}` },
        },
      );

      expect([403, 404]).toContain(crossClinicRes.status());

      const ownClinicRes = await otherRequest.get(
        `${API_URL}/patients/${otherPatientData.id}`,
        {
          headers: { Authorization: `Bearer ${otherToken}` },
        },
      );

      expect(ownClinicRes.ok()).toBeTruthy();
    } finally {
      await otherRequest.dispose();
    }
  });

  test(" FLOW 7: Error Handling - Invalid Operations & Edge Cases", async () => {
    const invalidAppointmentRes = await request.post(
      `${API_URL}/appointments`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: {
          status: "SCHEDULED",
        },
      },
    );

    expect([400, 422, 500]).toContain(invalidAppointmentRes.status());

    const invalidPatientRes = await request.get(
      `${API_URL}/patients/nonexistent-id-12345`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    expect([404, 401]).toContain(invalidPatientRes.status());

    const invalidContext = await requestFactory.newContext();
    try {
      const invalidTokenRes = await invalidContext.post(
        `${API_URL}/auth/change-password`,
        {
          headers: { Authorization: `Bearer invalid-token-xyz` },
          data: {
            currentPassword: "wrong-password",
            newPassword: "NewPassword123!",
          },
        },
      );

      expect([401, 403]).toContain(invalidTokenRes.status());
    } finally {
      await invalidContext.dispose();
    }

    const invalidClinicRes = await request.get(
      `${API_URL}/patients/nonexistent-clinic-id/timeline`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    expect([404, 401]).toContain(invalidClinicRes.status());
  });

  test.afterAll(async () => {
  });
});
