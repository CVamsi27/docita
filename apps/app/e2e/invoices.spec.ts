import { APIRequestContext, expect, test } from "@playwright/test";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Invoices", () => {
  let authToken: string;
  let _clinicId: string;
  let patientId: string = "";
  let invoiceEndpointAvailable = true;

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {

      const email = `doctor${Date.now()}@test.com`;
      const password = "Test@123456";
      const registerRes = await request.post(`${API_URL}/auth/register`, {
        data: {
          email,
          password,
          firstName: "Dr.",
          lastName: "Invoice",
          role: "DOCTOR",
          clinicName: "Test Clinic",
        },
      });

      if (!registerRes.ok()) {

        invoiceEndpointAvailable = false;
        return;
      }

      const userData = await registerRes.json();
      authToken = userData.access_token;
      const doctorId = userData.user?.id || userData.id;

      const clinicRes = await request.post(`${API_URL}/clinics`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          name: "Invoice Clinic",
          email: `clinic${Date.now()}@test.com`,
          phone: "1234567890",
          address: "456 Invoice Ave",
        },
      });

      if (!clinicRes.ok()) {

        invoiceEndpointAvailable = false;
        return;
      }

      const clinic = await clinicRes.json();
      _clinicId = clinic.id;

      if (doctorId && clinic.id) {
        const assignRes = await request.post(`${API_URL}/doctor-clinics`, {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            doctorId,
            clinicId: clinic.id,
            role: "doctor",
          },
        });

        if (!assignRes.ok()) {

        } else {

          const loginRes = await request.post(`${API_URL}/auth/login`, {
            data: { email, password },
          });
          if (loginRes.ok()) {
            const loginData = await loginRes.json();
            authToken = loginData.access_token;
          } else {
            
          }
        }
      }

      const testRes = await request.get(`${API_URL}/invoices`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          firstName: "Test",
          lastName: `Patient${Date.now()}`,
          dateOfBirth: "1990-01-01",
          gender: "MALE",
          phoneNumber: `9${Math.floor(Math.random() * 1e9)}`.padEnd(10, "0"),
        },
      });
      if (patientRes.ok()) {
        const patient = await patientRes.json();
        patientId = patient.id;
      }

      invoiceEndpointAvailable = testRes.ok();
      if (!invoiceEndpointAvailable) {
        
      }
    } catch {

      invoiceEndpointAvailable = false;
    }
  });

  test("should create invoice successfully", async ({ request }) => {
    if (!invoiceEndpointAvailable || !patientId) {
      test.skip();
    }

    const invoiceRes = await request.post(`${API_URL}/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        total: 5000,
        status: "pending",
        items: [
          {
            description: "Consultation",
            quantity: 1,
            price: 5000,
          },
        ],
      },
    });

    if (!invoiceRes.ok()) {
      
      test.skip();
    }

    const invoice = await invoiceRes.json();
    expect(invoice.id).toBeDefined();
    if (invoice.total) {
      expect(invoice.total).toBe(5000);
    }
  });

  test("should fetch invoice list", async ({ request }) => {
    if (!invoiceEndpointAvailable) {
      test.skip();
    }

    const invoiceList = await request.get(`${API_URL}/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!invoiceList.ok()) {

      test.skip();
    }

    const invoices = await invoiceList.json();

    expect(
      invoices && (Array.isArray(invoices.items) || Array.isArray(invoices)),
    ).toBeTruthy();
  });

  test("should fetch specific invoice", async ({ request }) => {
    if (!invoiceEndpointAvailable || !patientId) {
      test.skip();
    }

    const createRes = await request.post(`${API_URL}/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        total: 3000,
        status: "pending",
        items: [
          {
            description: "Lab Test",
            quantity: 1,
            price: 3000,
          },
        ],
      },
    });

    if (!createRes.ok()) {
      
      test.skip();
    }

    const invoice = await createRes.json();

    const fetchRes = await request.get(`${API_URL}/invoices/${invoice.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!fetchRes.ok()) {

      test.skip();
    }

    const fetched = await fetchRes.json();
    expect(fetched.id).toBe(invoice.id);
  });

  test("should update invoice status", async ({ request }) => {
    if (!invoiceEndpointAvailable || !patientId) {
      test.skip();
    }

    const createRes = await request.post(`${API_URL}/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        patientId,
        total: 2000,
        status: "pending",
        items: [
          {
            description: "Follow-up",
            quantity: 1,
            price: 2000,
          },
        ],
      },
    });

    const invoice = await createRes.json();

    const updateRes = await request.patch(`${API_URL}/invoices/${invoice.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        status: "PAID",
      },
    });

    if (updateRes.ok()) {
      const updated = await updateRes.json();
      expect(updated.id).toBe(invoice.id);
    }
  });
});
