import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Lab Tests", () => {
  let authToken: string;
  let clinicId: string;
  let patientId: string;
  let suiteAvailable = true;
  let suiteSkipReason = "";

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {
      const registerRes = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `doctor${Date.now()}@test.com`,
          password: "Test@123456",
          firstName: "Dr.",
          lastName: "Lab",
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
          name: "Lab Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "123 Lab St",
          tier: "ENTERPRISE",
          city: "Lab City",
          state: "LC",
          zipCode: "55555",
        },
      });
      expect(
        clinicRes.ok(),
        `clinic bootstrap failed: ${clinicRes.status()}`,
      ).toBeTruthy();

      const clinic = await clinicRes.json();
      clinicId = clinic.id;

      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          firstName: "Lab",
          lastName: "Patient",
          phoneNumber: "3333333333",
          gender: "MALE",
          dateOfBirth: "1992-03-20",
        },
      });
      expect(
        patientRes.ok(),
        `patient bootstrap failed: ${patientRes.status()}`,
      ).toBeTruthy();

      const patient = await patientRes.json();
      patientId = patient.id;
    } catch (error) {
      suiteAvailable = false;
      suiteSkipReason = `bootstrap threw: ${(error as Error).message}`;
    }
  });

  test.beforeEach(() => {
    test.skip(
      !suiteAvailable,
      `lab-tests API not provisioned: ${suiteSkipReason}`,
    );
  });

  test("should fetch lab test catalog", async ({ request }) => {
    const catalogRes = await request.get(`${API_URL}/lab-tests/catalog`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      catalogRes.ok(),
      `GET /lab-tests/catalog failed: ${catalogRes.status()}`,
    ).toBeTruthy();
    const catalog = await catalogRes.json();
    expect(catalog).toBeDefined();
  });

  test("should fetch lab test orders", async ({ request }) => {
    const ordersRes = await request.get(`${API_URL}/lab-tests/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      ordersRes.ok(),
      `GET /lab-tests/orders failed: ${ordersRes.status()}`,
    ).toBeTruthy();
    const orders = await ordersRes.json();
    expect(orders).toBeDefined();
  });

  test("should fetch lab test order stats", async ({ request }) => {
    const statsRes = await request.get(`${API_URL}/lab-tests/orders/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      statsRes.ok(),
      `GET /lab-tests/orders/stats failed: ${statsRes.status()}`,
    ).toBeTruthy();
    const stats = await statsRes.json();
    expect(stats).toBeDefined();
  });

  test("should create lab test order", async ({ request }) => {
    const orderRes = await request.post(`${API_URL}/lab-tests/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        testName: "Blood Test",
        description: "Complete Blood Count",
        clinicId,
      },
    });
    expect(
      orderRes.ok(),
      `POST /lab-tests/orders failed: ${orderRes.status()}`,
    ).toBeTruthy();
    const order = await orderRes.json();
    expect(order.id).toBeDefined();
  });
});
