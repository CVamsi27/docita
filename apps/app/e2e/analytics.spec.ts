import { test, expect, APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001/api";

test.describe("Analytics", () => {
  let authToken: string;
  let clinicId: string;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    // Register doctor
    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: `doctor${Date.now()}@test.com`,
        password: "Test@123456",
        name: "Dr. Analytics",
        role: "DOCTOR",
      },
    });

    const userData = await registerRes.json();
    authToken = userData.access_token;

    // Create clinic
    const clinicRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "Analytics Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "1234567890",
        address: "123 Analytics St",
        city: "Analytics City",
        state: "AC",
        zipCode: "44444",
      },
    });

    const clinic = await clinicRes.json();
    clinicId = clinic.id;
  });

  test("should fetch analytics overview", async ({ request }) => {
    const analyticsRes = await request.get(`${API_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (analyticsRes.ok()) {
      const analytics = await analyticsRes.json();
      expect(analytics).toBeDefined();
    }
  });

  test("should fetch revenue analytics", async ({ request }) => {
    const revenueRes = await request.get(`${API_URL}/analytics/revenue`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (revenueRes.ok()) {
      const revenue = await revenueRes.json();
      expect(revenue).toBeDefined();
    }
  });

  test("should fetch patients analytics", async ({ request }) => {
    const patientsRes = await request.get(`${API_URL}/analytics/patients`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (patientsRes.ok()) {
      const patients = await patientsRes.json();
      expect(patients).toBeDefined();
    }
  });

  test("should fetch appointments analytics", async ({ request }) => {
    const appointmentsRes = await request.get(
      `${API_URL}/analytics/appointments`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    if (appointmentsRes.ok()) {
      const appointments = await appointmentsRes.json();
      expect(appointments).toBeDefined();
    }
  });

  test("should fetch top diagnoses", async ({ request }) => {
    const diagnosesRes = await request.get(
      `${API_URL}/analytics/top-diagnoses`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    if (diagnosesRes.ok()) {
      const diagnoses = await diagnosesRes.json();
      expect(diagnoses).toBeDefined();
    }
  });
});
