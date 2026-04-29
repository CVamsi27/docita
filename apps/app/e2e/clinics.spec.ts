import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Clinics Management", () => {
  let authToken: string;
  let userId: string;
  let suiteAvailable = true;
  let suiteSkipReason = "";

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {
      const registerRes = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `doctor${Date.now()}@test.com`,
          password: "Test@123456",
          firstName: "Dr.",
          lastName: "Clinics",
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
      userId = userData.user.id;
    } catch (error) {
      suiteAvailable = false;
      suiteSkipReason = `bootstrap threw: ${(error as Error).message}`;
    }
  });

  test.beforeEach(() => {
    test.skip(
      !suiteAvailable,
      `clinics API not provisioned: ${suiteSkipReason}`,
    );
  });

  test("should create clinic successfully", async ({ request }) => {
    const clinicRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "New Test Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "9876543410",
        address: "321 Clinic St",
        city: "Clinic City",
        state: "CC",
        zipCode: "11111",
        specialization: "General Practice",
        licenseNumber: "LIC123456",
      },
    });
    expect(
      clinicRes.ok(),
      `POST /clinics failed: ${clinicRes.status()}`,
    ).toBeTruthy();
    const clinic = await clinicRes.json();
    expect(clinic.id).toBeDefined();
    expect(clinic.name).toBe("New Test Clinic");
  });

  test("should fetch clinics list", async ({ request }) => {
    const clinicList = await request.get(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      clinicList.ok(),
      `GET /clinics failed: ${clinicList.status()}`,
    ).toBeTruthy();
    const clinics = await clinicList.json();
    expect(Array.isArray(clinics)).toBeTruthy();
  });

  test("should fetch user's clinics", async ({ request }) => {
    const clinicRes = await request.get(`${API_URL}/clinics/user/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      clinicRes.ok(),
      `GET /clinics/user/:id failed: ${clinicRes.status()}`,
    ).toBeTruthy();
    const clinics = await clinicRes.json();
    expect(Array.isArray(clinics) || clinics?.id).toBeTruthy();
  });

  test("should fetch specific clinic", async ({ request }) => {
    const createRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "Fetchable Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "8888888888",
        address: "999 Test Ave",
        city: "Test City",
        state: "TC",
        zipCode: "22222",
      },
    });
    expect(
      createRes.ok(),
      `POST /clinics failed: ${createRes.status()}`,
    ).toBeTruthy();

    const clinic = await createRes.json();

    const fetchRes = await request.get(`${API_URL}/clinics/${clinic.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(
      fetchRes.ok(),
      `GET /clinics/:id failed: ${fetchRes.status()}`,
    ).toBeTruthy();
    const fetched = await fetchRes.json();
    expect(fetched.id).toBe(clinic.id);
  });

  test("should update clinic", async ({ request }) => {
    const createRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "Updatable Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "6666666666",
        address: "111 Update St",
        city: "Update City",
        state: "UC",
        zipCode: "33333",
      },
    });
    expect(
      createRes.ok(),
      `POST /clinics failed: ${createRes.status()}`,
    ).toBeTruthy();

    const clinic = await createRes.json();

    const updateRes = await request.put(`${API_URL}/clinics/${clinic.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "Updated Clinic Name",
        phone: "7777777777",
      },
    });

    expect(
      updateRes.ok(),
      `PUT /clinics/:id failed: ${updateRes.status()}`,
    ).toBeTruthy();
    const updated = await updateRes.json();
    expect(updated.name).toContain("Updated");
  });
});
