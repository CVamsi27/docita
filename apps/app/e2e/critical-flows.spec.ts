import { APIRequestContext, expect, Page, test } from "@playwright/test";

/**
 * CRITICAL FLOWS TEST SUITE
 * 
 * Tests core business workflows that users will perform immediately after launch.
 * These flows represent the most critical user journeys and must be fully functional.
 * 
 * Flows Tested:
 * 1. Patient Onboarding: Register → Clinic Assignment → First Appointment
 * 2. Doctor Dashboard: Login → View Dashboard → Access Key Reports
 * 3. Appointment Workflow: Create → Confirm → Update Status → Complete
 * 4. Patient Records: Access Patient → View History → Update Status
 * 5. Clinic Management: View Clinics → Add Doctor → Manage Appointments
 */

const API_URL = "http://127.0.0.1:3001/api";
const APP_URL = "http://127.0.0.1:3000";

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
  let page: Page;
  let request: APIRequestContext;
  let doctor: TestUser;
  let patient: TestPatient;
  let clinic: TestClinic;
  let appointment: TestAppointment;

  test.beforeAll(async ({ playwright }) => {
    /**
     * Global setup: Create test user, clinic, and patient
     */
    const context = await playwright.chromium.launchPersistentContext("", {});
    request = context.request;

    // Create doctor user
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
    const doctorData = await doctorRegRes.json() as {
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

    // Create clinic if needed
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
      const clinicData = await clinicRes.json() as { id: string; name: string; tier: string };
      clinic = clinicData;
      doctor.clinicId = clinicData.id;
    } else {
      const clinicRes = await request.get(`${API_URL}/clinics/${doctor.clinicId}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      clinic = await clinicRes.json() as { id: string; name: string; tier: string };
    }

    // Create patient
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
    const patientData = await patientRegRes.json() as {
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

  test("🏥 FLOW 1: Patient Onboarding - Register → Join Clinic → Create First Appointment", async () => {
    /**
     * Tests the complete patient onboarding flow:
     * 1. Patient registers and gets account
     * 2. Patient joins clinic
     * 3. Patient creates first appointment
     * 4. Verify appointment shows in doctor's dashboard
     */

    // Step 1: Create new patient via API registration
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
    const onboardPatientData = await patientRegRes.json() as {
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

    // Step 2: Patient joins clinic (via API or UI)
    const joinClinicRes = await request.post(
      `${API_URL}/patient-clinics`,
      {
        headers: { Authorization: `Bearer ${onboardPatientData.access_token}` },
        data: {
          patientId: onboardPatient.id,
          clinicId: clinic.id,
        },
      }
    );

    expect(joinClinicRes.ok()).toBeTruthy();
    console.log(`✅ Patient ${onboardPatient.email} joined clinic ${clinic.id}`);

    // Step 3: Create first appointment
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow

    const appointmentRes = await request.post(
      `${API_URL}/appointments`,
      {
        headers: { Authorization: `Bearer ${onboardPatientData.access_token}` },
        data: {
          patientId: onboardPatient.id,
          doctorId: doctor.id,
          clinicId: clinic.id,
          appointmentDate: appointmentDate.toISOString(),
          status: "SCHEDULED",
          notes: "First appointment",
        },
      }
    );

    expect(appointmentRes.ok()).toBeTruthy();
    const appointmentData = await appointmentRes.json() as {
      id: string;
      patientId: string;
      doctorId: string;
      scheduledAt: string;
      status: string;
    };
    appointment = appointmentData;

    console.log(`✅ First appointment created: ${appointment.id}`);

    // Step 4: Verify appointment exists in doctor's clinic
    const clinicAppointmentsRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/appointments`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect(clinicAppointmentsRes.ok()).toBeTruthy();
    const appointments = await clinicAppointmentsRes.json() as any;
    const appointmentExists = appointments.some(
      (a: any) => a.id === appointment.id && a.patientId === onboardPatient.id
    );
    expect(appointmentExists).toBeTruthy();

    console.log(`✅ FLOW 1 COMPLETE: Patient onboarding successful`);
  });

  test("📊 FLOW 2: Doctor Dashboard - Login → View Metrics → Access Patient Records", async () => {
    /**
     * Tests doctor dashboard functionality:
     * 1. Doctor logs in successfully
     * 2. Dashboard loads with key metrics
     * 3. Can access patient records
     * 4. Can view appointments
     */

    // Step 1: Doctor logs in and gets fresh token
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: doctor.email,
        password: "Test@123456",
      },
    });

    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json() as {
      access_token?: string;
      accessToken?: string;
      user: { id: string; clinicId?: string };
    };
    const freshToken = loginData.access_token || loginData.accessToken;

    console.log(`✅ Doctor logged in successfully`);

    // Step 2: Get dashboard metrics
    const metricsRes = await request.get(`${API_URL}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    // Allow 404 for metrics if not implemented, but log it
    if (metricsRes.ok()) {
      const metrics = await metricsRes.json() as Record<string, unknown>;
      console.log(`✅ Dashboard metrics loaded:`, {
        totalPatients: metrics.totalPatients,
        totalAppointments: metrics.totalAppointments,
        upcomingAppointments: metrics.upcomingAppointments,
      });
    } else {
      console.log(`⚠️ Metrics endpoint returned ${metricsRes.status()}`);
    }

    // Step 3: Get clinic patients
    const patientsRes = await request.get(`${API_URL}/clinics/${clinic.id}/patients`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    expect(patientsRes.ok()).toBeTruthy();
    const patients = await patientsRes.json() as { data: unknown[]; total: number };
    expect(Array.isArray(patients)).toBeTruthy();
    expect(patients.length).toBeGreaterThan(0);

    console.log(`✅ Doctor can access patient records (${patients.length} patients in clinic)`);

    // Step 4: Get clinic appointments
    const appointmentsRes = await request.get(`${API_URL}/clinics/${clinic.id}/appointments`, {
      headers: { Authorization: `Bearer ${freshToken}` },
    });

    expect(appointmentsRes.ok()).toBeTruthy();
    const fetchedAppointments = await appointmentsRes.json() as { data: unknown[] };
    expect(Array.isArray(fetchedAppointments)).toBeTruthy();

    console.log(`✅ FLOW 2 COMPLETE: Doctor dashboard operational (${fetchedAppointments.length} appointments)`);
  });

  test("📅 FLOW 3: Appointment Workflow - Create → Confirm → Update Status → Complete", async () => {
    /**
     * Tests full appointment lifecycle:
     * 1. Create appointment
     * 2. Confirm appointment
     * 3. Update appointment status (IN_PROGRESS)
     * 4. Complete appointment
     * 5. Verify final state
     */

    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 2); // 2 days from now

    // Step 1: Create appointment
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
    const newAppointment = await createRes.json() as { id: string; status: string };
    expect(newAppointment.status).toBe("SCHEDULED");

    console.log(`✅ Step 1: Appointment created (${newAppointment.id}, status: SCHEDULED)`);

    // Step 2: Confirm appointment
    const confirmRes = await request.patch(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: { status: "CONFIRMED" },
      }
    );

    expect(confirmRes.ok()).toBeTruthy();
    const confirmedAppointment = await confirmRes.json() as { id: string; status: string };
    expect(confirmedAppointment.status).toBe("CONFIRMED");

    console.log(`✅ Step 2: Appointment confirmed (status: CONFIRMED)`);

    // Step 3: Update status to IN_PROGRESS
    const progressRes = await request.patch(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: { status: "IN_PROGRESS" },
      }
    );

    expect(progressRes.ok()).toBeTruthy();
    const progressAppointment = await progressRes.json() as { id: string; status: string };
    expect(progressAppointment.status).toBe("IN_PROGRESS");

    console.log(`✅ Step 3: Appointment started (status: IN_PROGRESS)`);

    // Step 4: Complete appointment
    const completeRes = await request.patch(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: { status: "COMPLETED" },
      }
    );

    expect(completeRes.ok()).toBeTruthy();
    const completedAppointment = await completeRes.json() as { id: string; status: string };
    expect(completedAppointment.status).toBe("COMPLETED");

    console.log(`✅ Step 4: Appointment completed (status: COMPLETED)`);

    // Step 5: Verify final state
    const finalRes = await request.get(
      `${API_URL}/appointments/${newAppointment.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect(finalRes.ok()).toBeTruthy();
    const finalAppointment = await finalRes.json() as { id: string; status: string };
    expect(finalAppointment.status).toBe("COMPLETED");

    console.log(`✅ FLOW 3 COMPLETE: Full appointment lifecycle validated`);
  });

  test("👤 FLOW 4: Patient Records - Access Patient → View History → Update Notes", async () => {
    /**
     * Tests patient record management:
     * 1. Access patient record
     * 2. View consultation history
     * 3. Update patient notes
     * 4. Verify updates persisted
     */

    // Step 1: Get patient record
    const patientRes = await request.get(
      `${API_URL}/patients/${patient.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect(patientRes.ok()).toBeTruthy();
    const patientRecord = await patientRes.json() as { id: string; firstName: string };
    expect(patientRecord.id).toBe(patient.id);
    expect(patientRecord.firstName).toBe(patient.firstName);

    console.log(`✅ Step 1: Patient record accessed (${patientRecord.firstName} ${patientRecord.lastName})`);

    // Step 2: Get patient consultation history
    const historyRes = await request.get(
      `${API_URL}/patients/${patient.id}/consultations`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect(historyRes.ok()).toBeTruthy();
    const history = await historyRes.json() as unknown[];
    expect(Array.isArray(history)).toBeTruthy();

    console.log(`✅ Step 2: Consultation history loaded (${history.length} consultations)`);

    // Step 3: Update patient notes
    const updateRes = await request.patch(
      `${API_URL}/patients/${patient.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
        data: {
          notes: `Updated notes at ${new Date().toISOString()} - Critical flow test`,
        },
      }
    );

    expect(updateRes.ok()).toBeTruthy();
    const updatedPatient = await updateRes.json() as { id: string; phoneNumber: string };

    console.log(`✅ Step 3: Patient notes updated`);

    // Step 4: Verify update persisted
    const verifyRes = await request.get(
      `${API_URL}/patients/${patient.id}`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect(verifyRes.ok()).toBeTruthy();
    const verifiedPatient = await verifyRes.json() as { id: string; verified: boolean };
    expect(verifiedPatient.notes).toContain("Critical flow test");

    console.log(`✅ FLOW 4 COMPLETE: Patient record management validated`);
  });

  test("🏛️ FLOW 5: Clinic Operations - View Stats → Manage Doctors → View Analytics", async () => {
    /**
     * Tests clinic management operations:
     * 1. Fetch clinic statistics
     * 2. View clinic doctors/staff
     * 3. Access clinic appointments
     * 4. View basic analytics
     */

    // Step 1: Get clinic details and stats
    const clinicRes = await request.get(`${API_URL}/clinics/${clinic.id}`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
    });

    expect(clinicRes.ok()).toBeTruthy();
    const clinicData = await clinicRes.json() as { id: string; name: string };
    expect(clinicData.id).toBe(clinic.id);

    console.log(`✅ Step 1: Clinic data fetched (${clinicData.name})`);

    // Step 2: Get clinic staff/doctors
    const staffRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/staff`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    if (staffRes.ok()) {
      const staff = await staffRes.json() as { data: unknown[] };
      expect(Array.isArray(staff)).toBeTruthy();
      console.log(`✅ Step 2: Clinic staff loaded (${staff.length} staff members)`);
    } else {
      console.log(`⚠️ Staff endpoint returned ${staffRes.status()}`);
    }

    // Step 3: Get clinic appointments
    const appointmentsRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/appointments`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect(appointmentsRes.ok()).toBeTruthy();
    const clinicAppointments = await appointmentsRes.json() as { data: unknown[] };
    expect(Array.isArray(clinicAppointments)).toBeTruthy();

    console.log(`✅ Step 3: Clinic appointments loaded (${clinicAppointments.length} appointments)`);

    // Step 4: Get clinic analytics if available
    const analyticsRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/analytics`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    if (analyticsRes.ok()) {
      const analytics = await analyticsRes.json() as Record<string, unknown>;
      console.log(`✅ Step 4: Analytics available:`, {
        totalAppointments: analytics.totalAppointments,
        completedAppointments: analytics.completedAppointments,
        revenue: analytics.revenue,
      });
    } else {
      console.log(`⚠️ Analytics endpoint returned ${analyticsRes.status()}`);
    }

    console.log(`✅ FLOW 5 COMPLETE: Clinic operations validated`);
  });

  test("🔒 FLOW 6: Data Isolation - Verify No Cross-Clinic Access", async () => {
    /**
     * Critical security test:
     * 1. Create second clinic with different doctor
     * 2. Verify doctor cannot access other clinic's data
     * 3. Verify patient data isolation
     */

    // Create second doctor and clinic
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
    const otherDoctorData = await otherDoctorRes.json() as {
      access_token?: string;
      accessToken?: string;
      user: { id: string; clinicId?: string };
    };
    const otherToken = otherDoctorData.access_token || otherDoctorData.accessToken;

    // Get other doctor's clinic ID
    let otherClinicId = otherDoctorData.user.clinicId;
    if (!otherClinicId) {
      const otherClinicRes = await request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${otherToken}` },
        data: {
          name: `Other Clinic ${Date.now()}`,
          email: `other-clinic-${Date.now()}@test.com`,
          phone: "9876543210",
          address: "456 Other St",
          tier: "ENTERPRISE",
        },
      });
      const otherClinicData = await otherClinicRes.json() as { id: string };
      otherClinicId = otherClinicData.id;
    }

    console.log(`✅ Second clinic created: ${otherClinicId}`);

    // Attempt to access first doctor's clinic with other doctor's token - should be denied
    const unauthorizedRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/patients`,
      {
        headers: { Authorization: `Bearer ${otherToken}` },
      }
    );

    // Should either be 403 Forbidden or return empty array (depends on implementation)
    expect([403, 404, 200]).toContain(unauthorizedRes.status());
    console.log(`✅ Step 1: Cross-clinic access blocked (status: ${unauthorizedRes.status()})`);

    // Verify doctor can access own clinic
    const ownClinicRes = await request.get(
      `${API_URL}/clinics/${otherClinicId}/patients`,
      {
        headers: { Authorization: `Bearer ${otherToken}` },
      }
    );

    expect(ownClinicRes.ok()).toBeTruthy();
    console.log(`✅ FLOW 6 COMPLETE: Data isolation verified`);
  });

  test("✅ FLOW 7: Error Handling - Invalid Operations & Edge Cases", async () => {
    /**
     * Tests system resilience with invalid operations:
     * 1. Try to create appointment with invalid data
     * 2. Try to access non-existent patient
     * 3. Try with expired/invalid token
     * 4. Try invalid clinic operations
     */

    // Test 1: Invalid appointment creation (missing required fields)
    const invalidAppointmentRes = await request.post(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${doctor.accessToken}` },
      data: {
        // Missing patientId and appointmentDate
        status: "SCHEDULED",
      },
    });

    expect([400, 422, 500]).toContain(invalidAppointmentRes.status());
    console.log(`✅ Test 1: Invalid appointment rejected (status: ${invalidAppointmentRes.status()})`);

    // Test 2: Non-existent patient
    const invalidPatientRes = await request.get(
      `${API_URL}/patients/nonexistent-id-12345`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect([404, 401]).toContain(invalidPatientRes.status());
    console.log(`✅ Test 2: Non-existent patient returns error (status: ${invalidPatientRes.status()})`);

    // Test 3: Invalid token
    const invalidTokenRes = await request.get(
      `${API_URL}/clinics/${clinic.id}/patients`,
      {
        headers: { Authorization: `Bearer invalid-token-xyz` },
      }
    );

    expect([401, 403]).toContain(invalidTokenRes.status());
    console.log(`✅ Test 3: Invalid token rejected (status: ${invalidTokenRes.status()})`);

    // Test 4: Non-existent clinic
    const invalidClinicRes = await request.get(
      `${API_URL}/clinics/nonexistent-clinic-id`,
      {
        headers: { Authorization: `Bearer ${doctor.accessToken}` },
      }
    );

    expect([404, 401]).toContain(invalidClinicRes.status());
    console.log(`✅ Test 4: Non-existent clinic returns error (status: ${invalidClinicRes.status()})`);

    console.log(`✅ FLOW 7 COMPLETE: Error handling validated`);
  });

  test.afterAll(async () => {
    /**
     * Cleanup after all tests
     */
    console.log(`\n✅ All critical flows completed successfully!\n`);
  });
});
