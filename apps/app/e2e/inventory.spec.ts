import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Inventory Management", () => {
  let authToken: string;
  let clinicId: string;
  let suiteAvailable = true;
  let suiteSkipReason = "";

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {
      const registerRes = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `doctor${Date.now()}@test.com`,
          password: "Test@123456",
          firstName: "Dr.",
          lastName: "Inventory",
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
          name: "Inventory Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "123 Inventory St",
          tier: "ENTERPRISE",
          city: "Inventory City",
          state: "IC",
          zipCode: "66666",
        },
      });
      expect(
        clinicRes.ok(),
        `clinic bootstrap failed: ${clinicRes.status()}`,
      ).toBeTruthy();

      const clinic = await clinicRes.json();
      clinicId = clinic.id;
    } catch (error) {
      suiteAvailable = false;
      suiteSkipReason = `bootstrap threw: ${(error as Error).message}`;
    }
  });

  test.beforeEach(() => {
    test.skip(
      !suiteAvailable,
      `inventory API not provisioned: ${suiteSkipReason}`,
    );
  });

  test("should fetch inventory items", async ({ request }) => {
    const inventoryRes = await request.get(`${API_URL}/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      inventoryRes.ok(),
      `GET /inventory failed: ${inventoryRes.status()}`,
    ).toBeTruthy();
    const inventory = await inventoryRes.json();
    expect(inventory).toBeDefined();
  });

  test("should fetch inventory stats", async ({ request }) => {
    const statsRes = await request.get(`${API_URL}/inventory/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      statsRes.ok(),
      `GET /inventory/stats failed: ${statsRes.status()}`,
    ).toBeTruthy();
    const stats = await statsRes.json();
    expect(stats).toBeDefined();
  });

  test("should fetch low stock items", async ({ request }) => {
    const lowStockRes = await request.get(`${API_URL}/inventory/low-stock`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      lowStockRes.ok(),
      `GET /inventory/low-stock failed: ${lowStockRes.status()}`,
    ).toBeTruthy();
    const items = await lowStockRes.json();
    expect(items).toBeDefined();
  });

  test("should fetch expiring items", async ({ request }) => {
    const expiringRes = await request.get(`${API_URL}/inventory/expiring`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      expiringRes.ok(),
      `GET /inventory/expiring failed: ${expiringRes.status()}`,
    ).toBeTruthy();
    const items = await expiringRes.json();
    expect(items).toBeDefined();
  });

  test("should create inventory item", async ({ request }) => {
    const itemRes = await request.post(`${API_URL}/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "Bandages",
        sku: `BAN${Date.now()}`,
        quantity: 100,
        unitPrice: 50,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        clinicId,
      },
    });
    expect(
      itemRes.ok(),
      `POST /inventory failed: ${itemRes.status()}`,
    ).toBeTruthy();
    const item = await itemRes.json();
    expect(item.id).toBeDefined();
    expect(item.name).toBe("Bandages");
  });
});
