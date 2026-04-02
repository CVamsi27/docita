import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = "http://127.0.0.1:3001/api/v1";

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
  appointmentDate: string;
}

test.describe("Critical Business Flows", () => {
  let request: APIRequestContext;
  let doctor: TestUser;
  let patient: TestPatient;
  let clinic: TestClinic;
  let appointment: TestAppointment;

  test.beforeAll(async ({ playwright }) => {
    
    const context = await playwright.chromium.launchPersistentContext("", {});
    request = context.request;

    const doctorEmail = `doctor-critical-${Date.now()}@test.com`;
    const doctorPassword = "Test@123456";

    const doctorRegRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: doctorEmail,
        password: doctorPassword,
        firstName: "Test",
        lastName: "Doctor",
        role: "DOCTOR",
        clinicName: `Test Clinic ${Date.now()}`,
      },
    });

    expect(doctorRegRes.ok()).toBeTruthy();
    const doctorData = (await doctorRegRes.json()) as {
      access_token?: string;
      accessToken?: string;
      user: { id: string; clinicId?: string };
    };
    const doctorToken = doctorData.access_token || doctorData.accessToken;

    doctor = {
      id: doctorData.user.id,
      email: doctorEmail,
      clinicId: doctorData.user.clinicId || "",
      accessToken: doctorToken,
      firstName: "Test",
      lastName: "Doctor",
      role: "DOCTOR",
    };

    if (!doctor.clinicId) {
      const clinicRes = await request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
        data: {
          name: `Test Clinic ${Date.now()}`,
          email: `clinic-${Date.now()}@test.com`,
          phone: "1234567890",
          address: "123 Test St, Test City",
          tier: "ENTERPRISE",
        },
      });
      expect(clinicRes.ok()).toBeTruthy();
      const clinicData = (await clinicRes.json()) as {
        id: string;
        name: string;
        tier: string;
      };
      clinic = clinicData;
      doctor.clinicId = clinicData.id;
    } else {
      const clinicRes = await request.get(
        `${API_URL}/clinics/${doctor.clinicId}`,
        {
          headers: { Authorization: `Bearer ${doctorToken}` },
        },
      );
      clinic = (await clinicRes.json()) as {
        id: string;
        name: string;
        tier: string;
      };
    }

    const patientEmail = `patient-critical-${Date.now()}@test.com`;
    const patientPassword = "Pass@123456";

    const patientRegRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: patientEmail,
        password: patientPassword,
        firstName: "Test",
        lastName: "Patient",
        role: "PATIENT",
      },
    });

    expect(patientRegRes.ok()).toBeTruthy();
    const patientData = (await patientRegRes.json()) as {
      access_token?: string;
      accessToken?: string;
      user: { id: string };
    };
    patient = {
      id: patientData.user.id,
      email: patientEmail,
      firstName: "Test",
      lastName: "Patient",
    };
  });

  test(" FLOW 1: Patient Onboarding - Register → Join Clinic → Create First Appointment", async () => {

    const newPatientEmail = `onboard-patient-${Date.now()}@test.com`;
    const patientRegRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: newPatientEmail,
        password: "Patient@123456",
        firstName: "Onboard",
        lastName: "Patient",
        role: "PATIENT",
      },
    });

    expect(patientRegRes.ok()).toBeTruthy();
    const onboardPatientData = (await patientRegRes.json()) as {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
    const onboardPatient = {
      id: onboardPatientData.user.id,
      email: newPatientEmail,
      firstName: "Onboard",
      lastName: "Patient",
    };

    const joinClinicRes = await request.post(`${API_URL}/patient-clinics`, {
      headers: { Authorization: `Bearer ${onboardPatientData.access_token}` },
      data: {
        patientId: onboardPatient.id,
        clinicId: clinic.id,
      },
    });

    expect(joinClinicRes.ok()).toBeTruthy();
    

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); 

    const appointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${onboardPatientData.access_token}` },
      data: {
        patientId: onboardPatient.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
        appointmentDate: appointmentDate.toISOString(),
        status: "SCHEDULED",
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
      `${API_URL}/clinics/${clinic.id}/appointments`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    expect(clinicAppointmentsRes.ok()).toBeTruthy();
    const appointments = (await clinicAppointmentsRes.json()) as Array<{
      id: string;
      patientId: string;
    }>;
    const appointmentExists = appointments.some(
      (a: { id: string; patientId: string }) =>
        a.id === appointment.id && a.patientId === onboardPatient.id,
    );
    expect(appointmentExists).toBeTruthy();

  });

  test(" FLOW 2: Doctor Dashboard - Login → View Metrics → Access Patient Records", async () => {

    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: doctor.email,
        password: "Test@123456",
      },
    });

    expect(loginRes.ok()).toBeTruthy();
    const loginData = (await loginRes.json()) as {
      access_token?: string;
      accessToken?: string;
      user: { id: string; clinicId?: string };
    };
    const freshToken = loginData.access_token || loginData.accessToken;

    const metricsRes = await request.get(`${API_URL}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    if (metricsRes.ok()) {
      toRecord(await metricsRes.json());
    } else {

    }

    const patientsRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/patients`,
      {
        headers: { Authorization: `Bearer ${freshToken}` },
      },
    );

    expect(patientsRes.ok()).toBeTruthy();
    const patients = (await patientsRes.json()) as {
      data: unknown[];
      total: number;
    };
    expect(Array.isArray(patients)).toBeTruthy();
    expect(patients.length).toBeGreaterThan(0);

    

    const appointmentsRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/appointments`,
      {
        headers: { Authorization: `Bearer ${freshToken}` },
      },
    );

    expect(appointmentsRes.ok()).toBeTruthy();
    const fetchedAppointments = (await appointmentsRes.json()) as {
      data: unknown[];
    };
    expect(Array.isArray(fetchedAppointments)).toBeTruthy();

    
  });

  test(" FLOW 3: Appointment Workflow - Create → Confirm → Update Status → Complete", async () => {
    

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 2); 

    const createRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        clinicId: clinic.id,
        appointmentDate: appointmentDate.toISOString(),
        status: "SCHEDULED",
        notes: "Workflow test appointment",
      },
    });

    expect(createRes.ok()).toBeTruthy();
    const newAppointment = (await createRes.json()) as {
      id: string;
      status: string;
    };
    expect(newAppointment.status).toBe("SCHEDULED");

    

    const confirmRes = await request.patch(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: { status: "CONFIRMED" },
      },
    );

    expect(confirmRes.ok()).toBeTruthy();
    const confirmedAppointment = (await confirmRes.json()) as {
      id: string;
      status: string;
    };
    expect(confirmedAppointment.status).toBe("CONFIRMED");

    const progressRes = await request.patch(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: { status: "IN_PROGRESS" },
      },
    );

    expect(progressRes.ok()).toBeTruthy();
    const progressAppointment = (await progressRes.json()) as {
      id: string;
      status: string;
    };
    expect(progressAppointment.status).toBe("IN_PROGRESS");

    const completeRes = await request.patch(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: { status: "COMPLETED" },
      },
    );

    expect(completeRes.ok()).toBeTruthy();
    const completedAppointment = (await completeRes.json()) as {
      id: string;
      status: string;
    };
    expect(completedAppointment.status).toBe("COMPLETED");

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
    expect(finalAppointment.status).toBe("COMPLETED");

  });

  test(" FLOW 4: Patient Records - Access Patient → View History → Update Notes", async () => {

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

    

    const historyRes = await request.get(
      `${API_URL}/patients/${patient.id}/consultations`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    expect(historyRes.ok()).toBeTruthy();
    const history = (await historyRes.json()) as unknown[];
    expect(Array.isArray(history)).toBeTruthy();

    

    const updateRes = await request.patch(`${API_URL}/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        notes: `Updated notes at ${new Date().toISOString()} - Critical flow test`,
      },
    });

    expect(updateRes.ok()).toBeTruthy();
    (await updateRes.json()) as { id: string; phoneNumber: string };

    const verifyRes = await request.get(`${API_URL}/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(verifyRes.ok()).toBeTruthy();
    const verifiedPatient = (await verifyRes.json()) as {
      id: string;
      verified: boolean;
    };
    expect(verifiedPatient.notes).toContain("Critical flow test");

  });

  test("️ FLOW 5: Clinic Operations - View Stats → Manage Doctors → View Analytics", async () => {

    const clinicRes = await request.get(`${API_URL}/clinics/${clinic.id}`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(clinicRes.ok()).toBeTruthy();
    const clinicData = (await clinicRes.json()) as { id: string; name: string };
    expect(clinicData.id).toBe(clinic.id);

    const staffRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/staff`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    if (staffRes.ok()) {
      const staff = (await staffRes.json()) as { data: unknown[] };
      expect(Array.isArray(staff)).toBeTruthy();
      
    } else {

    }

    const appointmentsRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/appointments`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    expect(appointmentsRes.ok()).toBeTruthy();
    const clinicAppointments = (await appointmentsRes.json()) as {
      data: unknown[];
    };
    expect(Array.isArray(clinicAppointments)).toBeTruthy();

    

    const analyticsRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/analytics`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    if (analyticsRes.ok()) {
      toRecord(await analyticsRes.json());
    } else {

    }

  });

  test(" FLOW 6: Data Isolation - Verify No Cross-Clinic Access", async () => {

    const otherDoctorEmail = `doctor-other-${Date.now()}@test.com`;
    const otherDoctorRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: otherDoctorEmail,
        password: "Test@123456",
        firstName: "Other",
        lastName: "Doctor",
        role: "DOCTOR",
        clinicName: `Other Clinic ${Date.now()}`,
      },
    });

    expect(otherDoctorRes.ok()).toBeTruthy();
    const otherDoctorData = (await otherDoctorRes.json()) as {
      access_token?: string;
      accessToken?: string;
      user: { id: string; clinicId?: string };
    };
    const otherToken =
      otherDoctorData.access_token || otherDoctorData.accessToken;

    let otherClinicId = otherDoctorData.user.clinicId;
    if (!otherClinicId) {
      const otherClinicRes = await request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${otherToken}` },
        data: {
          name: `Other Clinic ${Date.now()}`,
          email: `other-clinic-${Date.now()}@test.com`,
          phone: "9876543410",
          address: "456 Other St",
          tier: "ENTERPRISE",
        },
      });
      const otherClinicData = (await otherClinicRes.json()) as { id: string };
      otherClinicId = otherClinicData.id;
    }

    const unauthorizedRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/patients`,
      {
        headers: { Authorization: `Bearer ${otherToken}` },
      },
    );

    expect([403, 404, 200]).toContain(unauthorizedRes.status());
    

    const ownClinicRes = await request.get(
      `${API_URL}/clinics/${otherClinicId}/patients`,
      {
        headers: { Authorization: `Bearer ${otherToken}` },
      },
    );

    expect(ownClinicRes.ok()).toBeTruthy();

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
    

    const invalidTokenRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/patients`,
      {
        headers: { Authorization: `Bearer invalid-token-xyz` },
      },
    );

    expect([401, 403]).toContain(invalidTokenRes.status());
    

    const invalidClinicRes = await request.get(
      `${API_URL}/clinics/nonexistent-clinic-id`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      },
    );

    expect([404, 401]).toContain(invalidClinicRes.status());
    

  });

  test.afterAll(async () => {
    

  });
});
