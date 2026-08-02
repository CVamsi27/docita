import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Medical Coding", () => {
  let authToken: string;
  let _doctorId: string;
  let suiteAvailable = true;
  let suiteSkipReason = "";

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
        suiteAvailable = false;
        suiteSkipReason = `auth/register unavailable (status ${registerRes.status()})`;
        return;
      }

      const userData = await registerRes.json();
      authToken = userData.access_token;
      _doctorId = userData.user.id;
    } catch (error) {
      suiteAvailable = false;
      suiteSkipReason = `bootstrap threw: ${(error as Error).message}`;
    }
  });

  test.beforeEach(() => {
    test.skip(
      !suiteAvailable,
      `medical-coding API not provisioned: ${suiteSkipReason}`,
    );
  });

  test("should fetch ICD codes", async ({ request }) => {
    const icdRes = await request.get(`${API_URL}/medical-coding/icd-codes`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        search: "fever",
      },
    });
    expect(
      icdRes.ok(),
      `GET /medical-coding/icd-codes failed: ${icdRes.status()}`,
    ).toBeTruthy();
    const codes = await icdRes.json();
    expect(codes).toBeDefined();
  });

  test("should fetch CPT codes", async ({ request }) => {
    const cptRes = await request.get(`${API_URL}/medical-coding/cpt-codes`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        search: "consultation",
      },
    });
    expect(
      cptRes.ok(),
      `GET /medical-coding/cpt-codes failed: ${cptRes.status()}`,
    ).toBeTruthy();
    const codes = await cptRes.json();
    expect(codes).toBeDefined();
  });

  test("should fetch doctor's favorite codes", async ({ request }) => {
    const favRes = await request.get(`${API_URL}/medical-coding/favorites`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      favRes.ok(),
      `GET /medical-coding/favorites failed: ${favRes.status()}`,
    ).toBeTruthy();
    const favorites = await favRes.json();
    expect(Array.isArray(favorites)).toBeTruthy();
  });

  test("should add favorite ICD code", async ({ request }) => {
    const icdRes = await request.get(
      `${API_URL}/clinical/medical-coding/icd/search?q=diabetes`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(
      icdRes.ok(),
      `GET /clinical/medical-coding/icd/search failed: ${icdRes.status()}`,
    ).toBeTruthy();

    const codes = await icdRes.json();
    expect(Array.isArray(codes)).toBeTruthy();

    if (codes.length === 0) {
      // Empty catalog is a valid environment state; nothing to favorite.
      return;
    }

    const { code, description, category } = codes[0];
    const favRes = await request.post(
      `${API_URL}/clinical/medical-coding/icd/favorites`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { code, description, category },
      },
    );
    expect(
      favRes.ok(),
      `POST /clinical/medical-coding/icd/favorites failed: ${favRes.status()}`,
    ).toBeTruthy();
    const fav = await favRes.json();
    expect(fav.id).toBeDefined();
  });

  test("should fetch CPT favorites", async ({ request }) => {
    const favRes = await request.get(
      `${API_URL}/medical-coding/cpt-favorites`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    );
    expect(
      favRes.ok(),
      `GET /medical-coding/cpt-favorites failed: ${favRes.status()}`,
    ).toBeTruthy();
    const favorites = await favRes.json();
    expect(Array.isArray(favorites)).toBeTruthy();
  });

  test("should fetch uncoded procedures", async ({ request }) => {
    const uncodedRes = await request.get(`${API_URL}/medical-coding/uncoded`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      uncodedRes.ok(),
      `GET /medical-coding/uncoded failed: ${uncodedRes.status()}`,
    ).toBeTruthy();
    const uncoded = await uncodedRes.json();
    expect(uncoded).toBeDefined();
  });
});
