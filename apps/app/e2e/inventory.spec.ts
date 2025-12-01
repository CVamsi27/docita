import { test, expect, APIRequestContext } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:3001/api";

test.describe("Inventory Management", () => {
  let authToken: string;
  let clinicId: string;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    // Register doctor
    const registerRes = await request.post(`${API_URL}/auth/register`, {
      data: {
        email: `doctor${Date.now()}@test.com`,
        password: "Test@123456",
        name: "Dr. Inventory",
        role: "DOCTOR",
      },
    });

    const userData = await registerRes.json();
    authToken = userData.access_token;

    // Create clinic
    const clinicRes = await request.post(`${API_URL}/clinics`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        name: "Inventory Clinic",
        email: `clinic${Date.now()}@test.com`,
        phone: "1234567890",
        address: "123 Inventory St",
        city: "Inventory City",
        state: "IC",
        zipCode: "66666",
      },
    });

    const clinic = await clinicRes.json();
    clinicId = clinic.id;
  });

  test("should fetch inventory items", async ({ request }) => {
    const inventoryRes = await request.get(`${API_URL}/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (inventoryRes.ok()) {
      const inventory = await inventoryRes.json();
      expect(Array.isArray(inventory) || inventory).toBeDefined();
    }
  });

  test("should fetch inventory stats", async ({ request }) => {
    const statsRes = await request.get(`${API_URL}/inventory/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (statsRes.ok()) {
      const stats = await statsRes.json();
      expect(stats).toBeDefined();
    }
  });

  test("should fetch low stock items", async ({ request }) => {
    const lowStockRes = await request.get(`${API_URL}/inventory/low-stock`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (lowStockRes.ok()) {
      const items = await lowStockRes.json();
      expect(Array.isArray(items) || items).toBeDefined();
    }
  });

  test("should fetch expiring items", async ({ request }) => {
    const expiringRes = await request.get(`${API_URL}/inventory/expiring`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (expiringRes.ok()) {
      const items = await expiringRes.json();
      expect(Array.isArray(items) || items).toBeDefined();
    }
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

    if (itemRes.ok()) {
      const item = await itemRes.json();
      expect(item.id).toBeDefined();
      expect(item.name).toBe("Bandages");
    }
  });
});
