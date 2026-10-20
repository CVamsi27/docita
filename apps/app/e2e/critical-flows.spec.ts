import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { expect, test as baseTest } from "@playwright/test";
import {
  DPDP_NOTICE_VERSION,
  appointmentResponseSchema,
  clinicResponseSchema,
  createAppointmentRequestSchema,
  createPatientRequestSchema,
  dashboardStatsResponseSchema,
  listAppointmentsResponseSchema,
  listPatientsResponseSchema,
  patientResponseSchema,
  patientTimelineResponseSchema,
  updatePatientRequestSchema,
  userSchema,
  type PatientContractResponse,
} from "@workspace/types";
import { seedPatientPhone } from "@workspace/utils";
import {
  API_URL,
  createUniqueClientIp,
  setupTestUser,
  type UserData,
} from "./utils/patient-helpers";

const clinicMemberIdentitySchema = userSchema
  .pick({ id: true, email: true, name: true, role: true })
  .array();

async function createPatient(
  request: APIRequestContext,
  doctor: UserData,
  firstName: string,
) {
  const data = createPatientRequestSchema.parse({
    email: `critical-patient-${randomUUID()}@test.com`,
    firstName,
    lastName: "Patient",
    gender: "OTHER",
    phoneNumber: seedPatientPhone(0),
    dateOfBirth: "1990-01-01",
    clinicId: doctor.clinicId,
    dpdpConsent: {
      accepted: true,
      noticeVersion: DPDP_NOTICE_VERSION,
      givenByName: "E2E Test",
    },
  });
  const response = await request.post(`${API_URL}/patients`, {
    headers: { Authorization: `Bearer ${doctor.accessToken}` },
    data,
  });
  expect(response.ok(), `Patient creation returned ${response.status()}`).toBe(
    true,
  );
  const patient = patientResponseSchema.parse(await response.json());
  expect(patient).toMatchObject({
    clinicId: doctor.clinicId,
    firstName,
    email: data.email,
  });
  return patient;
}

async function createAppointment(
  request: APIRequestContext,
  doctor: UserData,
  patient: PatientContractResponse,
) {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const data = createAppointmentRequestSchema.parse({
    patientId: patient.id,
    doctorId: doctor.id,
    clinicId: doctor.clinicId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: "scheduled",
    type: "consultation",
    notes: "Critical flow appointment",
  });
  const response = await request.post(`${API_URL}/appointments`, {
    headers: { Authorization: `Bearer ${doctor.accessToken}` },
    data,
  });
  expect(
    response.ok(),
    `Appointment creation returned ${response.status()}`,
  ).toBe(true);
  const appointment = appointmentResponseSchema.parse(await response.json());
  if (!appointment.id) throw new Error("Created appointment has no ID");
  expect(appointment).toMatchObject({
    patientId: patient.id,
    doctorId: doctor.id,
    clinicId: doctor.clinicId,
    status: "scheduled",
  });
  expect(new Date(appointment.startTime).toISOString()).toBe(
    start.toISOString(),
  );
  expect(new Date(appointment.endTime).toISOString()).toBe(end.toISOString());
  return { ...appointment, id: appointment.id };
}

const test = baseTest.extend<{
  doctor: UserData;
  patient: PatientContractResponse;
}>({
  doctor: async ({ request }, provideFixture) => {
    const clientIp = createUniqueClientIp();
    const doctor = await setupTestUser(request, {
      "X-Forwarded-For": clientIp,
      "X-Real-IP": clientIp,
    });
    expect(doctor.clinicId).not.toBe("");
    await provideFixture(doctor);
  },
  patient: async ({ request, doctor }, provideFixture) => {
    await provideFixture(await createPatient(request, doctor, "Critical"));
  },
});

test.describe("Critical Business Flows", () => {
  test("Patient onboarding creates a clinic-owned patient and first appointment", async ({
    request,
    doctor,
    patient,
  }) => {
    const appointment = await createAppointment(request, doctor, patient);
    const response = await request.get(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      params: { doctorId: doctor.id },
    });
    expect(response.ok()).toBe(true);
    const appointments = listAppointmentsResponseSchema.parse(
      await response.json(),
    );
    const persisted = appointments.items.find(
      (item) => item.id === appointment.id,
    );
    expect(persisted).toMatchObject({
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: doctor.clinicId,
      status: "scheduled",
    });
    if (!persisted)
      throw new Error("Created appointment missing from clinic list");
    expect(new Date(persisted.startTime).toISOString()).toBe(
      new Date(appointment.startTime).toISOString(),
    );
    expect(new Date(persisted.endTime).toISOString()).toBe(
      new Date(appointment.endTime).toISOString(),
    );
  });

  test("Doctor dashboard returns metrics and the doctor's patient records", async ({
    request,
    doctor,
    patient,
  }) => {
    const appointment = await createAppointment(request, doctor, patient);
    const headers = { Authorization: `Bearer ${doctor.accessToken}` };
    const metricsResponse = await request.get(`${API_URL}/dashboard/stats`, {
      headers,
    });
    expect(metricsResponse.ok()).toBe(true);
    const metrics = dashboardStatsResponseSchema.parse(
      await metricsResponse.json(),
    );
    expect(metrics.totalPatients).toBeGreaterThanOrEqual(1);
    expect(metrics.totalAppointments).toBeGreaterThanOrEqual(1);

    const patientsResponse = await request.get(`${API_URL}/patients`, {
      headers,
    });
    expect(patientsResponse.ok()).toBe(true);
    const patients = listPatientsResponseSchema.parse(
      await patientsResponse.json(),
    );
    expect(patients.total).toBeGreaterThanOrEqual(1);
    expect(patients.items).toContainEqual(
      expect.objectContaining({ id: patient.id, clinicId: doctor.clinicId }),
    );
    expect(
      patients.items.every((item) => item.clinicId === doctor.clinicId),
    ).toBe(true);

    const appointmentsResponse = await request.get(`${API_URL}/appointments`, {
      headers,
      params: { doctorId: doctor.id },
    });
    expect(appointmentsResponse.ok()).toBe(true);
    const appointments = listAppointmentsResponseSchema.parse(
      await appointmentsResponse.json(),
    );
    expect(appointments.items).toContainEqual(
      expect.objectContaining({
        id: appointment.id,
        doctorId: doctor.id,
        clinicId: doctor.clinicId,
      }),
    );
    expect(
      appointments.items.every(
        (item) =>
          item.clinicId === doctor.clinicId && item.doctorId === doctor.id,
      ),
    ).toBe(true);
  });

  test("Appointment detail preserves the booked patient, doctor and UTC instants", async ({
    request,
    doctor,
    patient,
  }) => {
    const appointment = await createAppointment(request, doctor, patient);
    const response = await request.get(
      `${API_URL}/appointments/${appointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );
    expect(response.ok()).toBe(true);
    const persisted = appointmentResponseSchema.parse(await response.json());
    expect(persisted).toMatchObject({
      id: appointment.id,
      patientId: patient.id,
      doctorId: doctor.id,
      clinicId: doctor.clinicId,
      status: "scheduled",
    });
    expect(new Date(persisted.startTime).toISOString()).toBe(
      new Date(appointment.startTime).toISOString(),
    );
    expect(new Date(persisted.endTime).toISOString()).toBe(
      new Date(appointment.endTime).toISOString(),
    );
  });

  test("Patient records expose their appointment timeline and persist updated notes", async ({
    request,
    doctor,
    patient,
  }) => {
    const headers = { Authorization: `Bearer ${doctor.accessToken}` };
    const appointment = await createAppointment(request, doctor, patient);
    const patientResponse = await request.get(
      `${API_URL}/patients/${patient.id}`,
      { headers },
    );
    expect(patientResponse.ok()).toBe(true);
    const record = patientResponseSchema.parse(await patientResponse.json());
    expect(record).toMatchObject({
      id: patient.id,
      firstName: patient.firstName,
      clinicId: doctor.clinicId,
    });

    const timelineResponse = await request.get(
      `${API_URL}/patients/${patient.id}/timeline`,
      { headers },
    );
    expect(timelineResponse.ok()).toBe(true);
    const timeline = patientTimelineResponseSchema.parse(
      await timelineResponse.json(),
    );
    expect(timeline.events).toContainEqual(
      expect.objectContaining({ type: "APPOINTMENT", id: appointment.id }),
    );
    expect(timeline.total).toBeGreaterThanOrEqual(1);

    const note = `Critical flow note ${randomUUID()}`;
    const updateResponse = await request.patch(
      `${API_URL}/patients/${patient.id}`,
      {
        headers,
        data: updatePatientRequestSchema.parse({ metadata: { e2eNote: note } }),
      },
    );
    expect(updateResponse.ok()).toBe(true);
    const updated = patientResponseSchema.parse(await updateResponse.json());
    expect(updated.metadata?.["e2eNote"]).toBe(note);
    const verifyResponse = await request.get(
      `${API_URL}/patients/${patient.id}`,
      { headers },
    );
    expect(verifyResponse.ok()).toBe(true);
    const persisted = patientResponseSchema.parse(await verifyResponse.json());
    expect(persisted).toMatchObject({
      id: patient.id,
      clinicId: doctor.clinicId,
    });
    expect(persisted.metadata?.["e2eNote"]).toBe(note);
  });

  test("Clinic operations return the current clinic, its owner and booked appointments", async ({
    request,
    doctor,
    patient,
  }) => {
    const appointment = await createAppointment(request, doctor, patient);
    const headers = { Authorization: `Bearer ${doctor.accessToken}` };
    const clinicResponse = await request.get(`${API_URL}/clinics/settings`, {
      headers,
    });
    expect(clinicResponse.ok()).toBe(true);
    const clinic = clinicResponseSchema.parse(await clinicResponse.json());
    expect(clinic.id).toBe(doctor.clinicId);
    expect(clinic.name).not.toBe("");

    const membersResponse = await request.get(`${API_URL}/clinics/members`, {
      headers,
    });
    expect(membersResponse.ok()).toBe(true);
    const members = clinicMemberIdentitySchema.parse(
      await membersResponse.json(),
    );
    expect(members).toContainEqual(
      expect.objectContaining({
        id: doctor.id,
        email: doctor.email,
        role: "ADMIN_DOCTOR",
      }),
    );

    const appointmentsResponse = await request.get(`${API_URL}/appointments`, {
      headers,
      params: { doctorId: doctor.id },
    });
    expect(appointmentsResponse.ok()).toBe(true);
    const appointments = listAppointmentsResponseSchema.parse(
      await appointmentsResponse.json(),
    );
    expect(appointments.items).toContainEqual(
      expect.objectContaining({
        id: appointment.id,
        clinicId: doctor.clinicId,
        doctorId: doctor.id,
      }),
    );
    expect(
      appointments.items.every((item) => item.clinicId === doctor.clinicId),
    ).toBe(true);
  });

  test("Data isolation denies another clinic's patient and appointment", async ({
    request,
    playwright,
    doctor,
    patient,
  }) => {
    const appointment = await createAppointment(request, doctor, patient);
    const clientIp = createUniqueClientIp();
    const requestHeaders = {
      "X-Forwarded-For": clientIp,
      "X-Real-IP": clientIp,
    };
    const otherRequest = await playwright.request.newContext({
      extraHTTPHeaders: requestHeaders,
    });
    try {
      const otherDoctor = await setupTestUser(otherRequest, requestHeaders);
      expect(otherDoctor.clinicId).not.toBe(doctor.clinicId);
      const otherPatient = await createPatient(
        otherRequest,
        otherDoctor,
        "OtherClinic",
      );
      const headers = { Authorization: `Bearer ${otherDoctor.accessToken}` };
      const crossPatientResponse = await otherRequest.get(
        `${API_URL}/patients/${patient.id}`,
        { headers },
      );
      expect([403, 404]).toContain(crossPatientResponse.status());
      const crossAppointmentResponse = await otherRequest.get(
        `${API_URL}/appointments/${appointment.id}`,
        { headers },
      );
      expect([403, 404]).toContain(crossAppointmentResponse.status());

      const ownPatientResponse = await otherRequest.get(
        `${API_URL}/patients/${otherPatient.id}`,
        { headers },
      );
      expect(ownPatientResponse.ok()).toBe(true);
      const ownPatient = patientResponseSchema.parse(
        await ownPatientResponse.json(),
      );
      expect(ownPatient).toMatchObject({
        id: otherPatient.id,
        clinicId: otherDoctor.clinicId,
      });
      const listResponse = await otherRequest.get(`${API_URL}/patients`, {
        headers,
      });
      expect(listResponse.ok()).toBe(true);
      const listed = listPatientsResponseSchema.parse(
        await listResponse.json(),
      );
      expect(listed.items).toContainEqual(
        expect.objectContaining({
          id: otherPatient.id,
          clinicId: otherDoctor.clinicId,
        }),
      );
      expect(
        listed.items.every((item) => item.clinicId === otherDoctor.clinicId),
      ).toBe(true);
      expect(listed.items.some((item) => item.id === patient.id)).toBe(false);
    } finally {
      await otherRequest.dispose();
    }
  });

  test("Invalid operations return client errors and reject invalid authentication", async ({
    request,
    playwright,
    doctor,
  }) => {
    const headers = { Authorization: `Bearer ${doctor.accessToken}` };
    const invalidAppointmentResponse = await request.post(
      `${API_URL}/appointments`,
      {
        headers,
        data: { status: "SCHEDULED" },
      },
    );
    expect(invalidAppointmentResponse.status()).toBe(400);

    const missingPatientId = randomUUID();
    const missingPatientResponse = await request.get(
      `${API_URL}/patients/${missingPatientId}`,
      { headers },
    );
    expect(missingPatientResponse.status()).toBe(404);
    const missingTimelineResponse = await request.get(
      `${API_URL}/patients/${missingPatientId}/timeline`,
      { headers },
    );
    expect(missingTimelineResponse.status()).toBe(404);

    const invalidRequest = await playwright.request.newContext();
    try {
      const invalidTokenResponse = await invalidRequest.post(
        `${API_URL}/auth/change-password`,
        {
          headers: { Authorization: "Bearer invalid-token-xyz" },
          data: {
            currentPassword: "wrong-password",
            newPassword: "NewPassword123!",
          },
        },
      );
      expect(invalidTokenResponse.status()).toBe(401);
    } finally {
      await invalidRequest.dispose();
    }
  });
});
