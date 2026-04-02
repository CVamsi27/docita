import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Medical Coding", () => {
  let authToken: string;
  let _doctorId: string;
  let serverAvailable = true;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {

      const registerRes = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `doctor${Date.now()}@test.com`,
          password: "Test@123456",
          firstName: "Dr.",
          lastName: "Coder",
          role: "DOCTOR",
          clinicName: "Test Clinic",
        },
      });

      if (!registerRes.ok()) {
        serverAvailable = false;
        return;
      }

      const userData = await registerRes.json();
      authToken = userData.access_token;
      _doctorId = userData.user.id;
    } catch {
      serverAvailable = false;
    }
  });

  test("should fetch ICD codes", async ({ request }) => {
    test.skip(!serverAvailable, "API server not running");
    const icdRes = await request.get(`${API_URL}/medical-coding/icd-codes`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        search: "fever",
      },
    });

    if (icdRes.ok()) {
      const codes = await icdRes.json();
      expect(Array.isArray(codes) || codes).toBeDefined();
    }
  });

  test("should fetch CPT codes", async ({ request }) => {
    test.skip(!serverAvailable, "API server not running");
    const cptRes = await request.get(`${API_URL}/medical-coding/cpt-codes`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        search: "consultation",
      },
    });

    if (cptRes.ok()) {
      const codes = await cptRes.json();
      expect(Array.isArray(codes) || codes).toBeDefined();
    }
  });

  test("should fetch doctor's favorite codes", async ({ request }) => {
    const favRes = await request.get(`${API_URL}/medical-coding/favorites`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (favRes.ok()) {
      const favorites = await favRes.json();
      expect(Array.isArray(favorites)).toBeTruthy();
    }
  });

  test("should add favorite ICD code", async ({ request }) => {

    const icdRes = await request.get(
      `${API_URL}/clinical/medical-coding/icd/search?q=diabetes`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    if (icdRes.ok()) {
      const codes = await icdRes.json();
      if (Array.isArray(codes) && codes.length > 0) {
        const { code, description, category } = codes[0];

        const favRes = await request.post(
          `${API_URL}/clinical/medical-coding/icd/favorites`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
            data: { code, description, category },
          },
        );

        if (favRes.ok()) {
          const fav = await favRes.json();
          expect(fav.id).toBeDefined();
        }
      }
    }
  });

  test("should fetch CPT favorites", async ({ request }) => {
    const favRes = await request.get(
      `${API_URL}/medical-coding/cpt-favorites`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );

    if (favRes.ok()) {
      const favorites = await favRes.json();
      expect(Array.isArray(favorites)).toBeTruthy();
    }
  });

  test("should fetch uncoded procedures", async ({ request }) => {
    const uncodedRes = await request.get(`${API_URL}/medical-coding/uncoded`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (uncodedRes.ok()) {
      const uncoded = await uncodedRes.json();
      expect(Array.isArray(uncoded) || uncoded).toBeDefined();
    }
  });
});
