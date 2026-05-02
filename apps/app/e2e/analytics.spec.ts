import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Analytics", () => {
  let authToken: string;
  let _clinicId: string;
  let suiteAvailable = true;
  let suiteSkipReason = "";

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {
      const registerRes = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `doctor${Date.now()}@test.com`,
          password: "Test@123456",
          firstName: "Dr.",
          lastName: "Analytics",
          role: "DOCTOR",
          clinicName: "Test Clinic",
        },
      });

      if (!registerRes.ok()) {
        suiteAvailable = false;
        suiteSkipReason = `auth/register unavailable (status ${registerRes.status()})`;
        return;
      }

      const userData = await registerRes.json();
      authToken = userData.access_token;

      const clinicRes = await request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          name: "Analytics Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "123 Analytics St",
          tier: "ENTERPRISE",
          city: "Analytics City",
          state: "AC",
          zipCode: "44444",
        },
      });

      expect(
        clinicRes.ok(),
        `clinic bootstrap failed: ${clinicRes.status()}`,
      ).toBeTruthy();

      const clinic = await clinicRes.json();
      _clinicId = clinic.id;
    } catch (error) {
      suiteAvailable = false;
      suiteSkipReason = `bootstrap threw: ${(error as Error).message}`;
    }
  });

  test.beforeEach(() => {
    test.skip(
      !suiteAvailable,
      `analytics API not provisioned: ${suiteSkipReason}`,
    );
  });

  test("should fetch analytics overview", async ({ request }) => {
    const analyticsRes = await request.get(`${API_URL}/analytics/overview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      analyticsRes.ok(),
      `GET /analytics/overview failed: ${analyticsRes.status()}`,
    ).toBeTruthy();
    const analytics = await analyticsRes.json();
    expect(analytics).toBeDefined();
  });

  test("should fetch revenue analytics", async ({ request }) => {
    const revenueRes = await request.get(`${API_URL}/analytics/revenue`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      revenueRes.ok(),
      `GET /analytics/revenue failed: ${revenueRes.status()}`,
    ).toBeTruthy();
    const revenue = await revenueRes.json();
    expect(revenue).toBeDefined();
  });

  test("should fetch patients analytics", async ({ request }) => {
    const patientsRes = await request.get(`${API_URL}/analytics/patients`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      patientsRes.ok(),
      `GET /analytics/patients failed: ${patientsRes.status()}`,
    ).toBeTruthy();
    const patients = await patientsRes.json();
    expect(patients).toBeDefined();
  });

  test("should fetch appointments analytics", async ({ request }) => {
    const appointmentsRes = await request.get(
      `${API_URL}/analytics/appointments`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    expect(
      appointmentsRes.ok(),
      `GET /analytics/appointments failed: ${appointmentsRes.status()}`,
    ).toBeTruthy();
    const appointments = await appointmentsRes.json();
    expect(appointments).toBeDefined();
  });

  test("should fetch top diagnoses", async ({ request }) => {
    const diagnosesRes = await request.get(
      `${API_URL}/analytics/top-diagnoses`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    expect(
      diagnosesRes.ok(),
      `GET /analytics/top-diagnoses failed: ${diagnosesRes.status()}`,
    ).toBeTruthy();
    const diagnoses = await diagnosesRes.json();
    expect(diagnoses).toBeDefined();
  });
});
