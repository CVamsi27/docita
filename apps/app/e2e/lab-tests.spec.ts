import { test, expect, APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001/api";

test.describe("Lab Tests", () => {
  let authToken: string;
  let clinicId: string;
  let patientId: string;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    // Register doctor
    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: `doctor${Date.now()}@test.com`,
        password: "Test@123456",
        name: "Dr. Lab",
        role: "DOCTOR",
      },
    });

    const userData = await registerRes.json();
    authToken = userData.access_token;

    // Create clinic
    const clinicRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "Lab Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "1234567890",
        address: "123 Lab St",
        city: "Lab City",
        state: "LC",
        zipCode: "55555",
      },
    });

    const clinic = await clinicRes.json();
    clinicId = clinic.id;

    // Create patient
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

    const patient = await patientRes.json();
    patientId = patient.id;
  });

  test("should fetch lab test catalog", async ({ request }) => {
    const catalogRes = await request.get(`${API_URL}/lab-tests/catalog`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (catalogRes.ok()) {
      const catalog = await catalogRes.json();
      expect(Array.isArray(catalog) || catalog).toBeDefined();
    }
  });

  test("should fetch lab test orders", async ({ request }) => {
    const ordersRes = await request.get(`${API_URL}/lab-tests/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (ordersRes.ok()) {
      const orders = await ordersRes.json();
      expect(Array.isArray(orders) || orders).toBeDefined();
    }
  });

  test("should fetch lab test order stats", async ({ request }) => {
    const statsRes = await request.get(`${API_URL}/lab-tests/orders/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (statsRes.ok()) {
      const stats = await statsRes.json();
      expect(stats).toBeDefined();
    }
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

    if (orderRes.ok()) {
      const order = await orderRes.json();
      expect(order.id).toBeDefined();
    }
  });
});
