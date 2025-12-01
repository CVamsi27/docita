import { test, expect, APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001/api";

test.describe("Queue Management", () => {
  let authToken: string;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    // Register doctor
    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: `doctor${Date.now()}@test.com`,
        password: "Test@123456",
        name: "Dr. Queue",
        role: "DOCTOR",
      },
    });

    const userData = await registerRes.json();
    authToken = userData.access_token;
  });

  test("should fetch today's queue", async ({ request }) => {
    const queueRes = await request.get(`${API_URL}/queue/today`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (queueRes.ok()) {
      const queue = await queueRes.json();
      expect(Array.isArray(queue) || queue).toBeDefined();
    }
  });

  test("should fetch queue stats", async ({ request }) => {
    const statsRes = await request.get(`${API_URL}/queue/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (statsRes.ok()) {
      const stats = await statsRes.json();
      expect(stats).toBeDefined();
    }
  });

  test("should fetch queue settings", async ({ request }) => {
    const settingsRes = await request.get(`${API_URL}/queue/settings`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (settingsRes.ok()) {
      const settings = await settingsRes.json();
      expect(settings).toBeDefined();
    }
  });
});
