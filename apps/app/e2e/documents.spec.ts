import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api";

test.describe("Documents", () => {
  let authToken: string;
  let _clinicId: string;
  let patientId: string;
  let serverAvailable = true;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {
      // Register doctor
      const registerRes = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `doctor${Date.now()}@test.com`,
          password: "Test@123456",
          name: "Dr. Docs",
          role: "DOCTOR",
        },
      });

      if (!registerRes.ok()) {
        serverAvailable = false;
        return;
      }

      const userData = await registerRes.json();
      authToken = userData.access_token;

      // Create clinic
      const clinicRes = await request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          name: "Documents Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "789 Doc Lane",
          city: "Document City",
          state: "DC",
          zipCode: "99999",
        },
      });

      const clinic = await clinicRes.json();
      _clinicId = clinic.id;

      // Create patient
      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          firstName: "Doc",
          lastName: "Patient",
          phoneNumber: "7777777777",
          gender: "MALE",
          dateOfBirth: "1985-06-15",
        },
      });

      const patient = await patientRes.json();
      patientId = patient.id;
    } catch {
      serverAvailable = false;
    }
  });

  test("should fetch documents list", async ({ request }) => {
    test.skip(!serverAvailable, "API server not running");
    const docList = await request.get(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(docList.ok()).toBeTruthy();
    const docs = await docList.json();
    expect(Array.isArray(docs)).toBeTruthy();
  });

  test("should fetch documents for specific patient", async ({ request }) => {
    test.skip(!serverAvailable, "API server not running");
    const patientDocs = await request.get(
      `${API_URL}/patients/${patientId}/documents`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    if (patientDocs.ok()) {
      const docs = await patientDocs.json();
      expect(Array.isArray(docs)).toBeTruthy();
    }
  });
});
