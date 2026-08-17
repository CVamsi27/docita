import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { setupTestUser } from "./utils/patient-helpers";

const API_URL = process.env["API_URL"] || "http://localhost:3001/api/v1";

test.describe("Lab Tests", () => {
  let authToken: string;
  let clinicId: string;
  let patientId: string;
  let suiteAvailable = true;
  let suiteSkipReason = "";

  test.beforeAll(async ({ request }: { request: APIRequestContext }) => {
    try {
      // Provision through the modern onboarding flow: register-with-clinicName
      // hard-400s (clinic registration moved to onboarding) and the /clinics
      // CRUD controller is now INTERNAL-only, so a doctor can no longer create
      // a clinic via the API. setupTestUser runs register -> onboarding -> login
      // and returns an onboarded clinic (lab tests are ESSENTIAL-tier).
      const user = await setupTestUser(request);
      authToken = user.accessToken;
      clinicId = user.clinicId;

      const patientRes = await request.post(`${API_URL}/patients`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          firstName: "Lab",
          lastName: "Patient",
          phoneNumber: "3333333333",
          gender: "MALE",
          dateOfBirth: "1992-03-20",
          // POST /patients enforces DPDP consent at the controller (400
          // without it); mirror the critical-flows payload.
          dpdpConsent: {
            accepted: true,
            noticeVersion: DPDP_NOTICE_VERSION,
            givenByName: "E2E Lab Test",
          },
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
    const catalogRes = await request.get(`${API_URL}/clinical/lab-tests`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(
      catalogRes.ok(),
      `GET /clinical/lab-tests failed: ${catalogRes.status()}`,
    ).toBeTruthy();
    const catalog = await catalogRes.json();
    expect(catalog).toBeDefined();
  });

  test("should fetch lab test orders", async ({ request }) => {
    const ordersRes = await request.get(
      `${API_URL}/clinical/lab-tests/orders`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(
      ordersRes.ok(),
      `GET /clinical/lab-tests/orders failed: ${ordersRes.status()}`,
    ).toBeTruthy();
    const orders = await ordersRes.json();
    expect(orders).toBeDefined();
  });

  test("should fetch lab test order stats", async ({ request }) => {
    const statsRes = await request.get(
      `${API_URL}/clinical/lab-tests/stats`,
      { headers: { Authorization: `Bearer ${authToken}` } },
    );
    expect(
      statsRes.ok(),
      `GET /clinical/lab-tests/stats failed: ${statsRes.status()}`,
    ).toBeTruthy();
    const stats = await statsRes.json();
    expect(stats).toBeDefined();
  });

  test("should create lab test order", async ({ request }) => {
    const auth = { Authorization: `Bearer ${authToken}` };

    const testRes = await request.post(`${API_URL}/clinical/lab-tests`, {
      headers: auth,
      data: { name: "Blood Test", category: "hematology", clinicId },
    });
    expect(testRes.ok(), `create test failed: ${testRes.status()}`).toBeTruthy();
    const labTest = await testRes.json();

    const orderRes = await request.post(`${API_URL}/clinical/lab-tests/orders`, {
      headers: auth,
      data: { patientId, labTestId: labTest.id, clinicId },
    });
    expect(
      orderRes.ok(),
      `POST /clinical/lab-tests/orders failed: ${orderRes.status()}`,
    ).toBeTruthy();
    const order = await orderRes.json();
    expect(order.id).toBeDefined();
  });

  // Full lab workflow: order → sample → result upload → payment-gated release.
  test("should gate release on payment then complete the order", async ({
    request,
  }) => {
    const auth = { Authorization: `Bearer ${authToken}` };

    const testRes = await request.post(`${API_URL}/clinical/lab-tests`, {
      headers: auth,
      data: { name: "CBC", category: "hematology", clinicId },
    });
    expect(testRes.ok(), `create test failed: ${testRes.status()}`).toBeTruthy();
    const labTest = await testRes.json();

    const orderRes = await request.post(
      `${API_URL}/clinical/lab-tests/orders`,
      { headers: auth, data: { patientId, labTestId: labTest.id, clinicId } },
    );
    expect(
      orderRes.ok(),
      `create order failed: ${orderRes.status()}`,
    ).toBeTruthy();
    const order = await orderRes.json();

    const sampleRes = await request.put(
      `${API_URL}/clinical/lab-tests/orders/${order.id}/sample`,
      { headers: auth, data: { notes: "Received at lab" } },
    );
    expect(sampleRes.ok(), `sample failed: ${sampleRes.status()}`).toBeTruthy();

    const uploadRes = await request.post(
      `${API_URL}/clinical/lab-tests/orders/${order.id}/result`,
      {
        headers: auth,
        multipart: {
          file: {
            name: "report.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.from("%PDF-1.4 test report"),
          },
        },
      },
    );
    expect(uploadRes.ok(), `upload failed: ${uploadRes.status()}`).toBeTruthy();

    // Release must be blocked until payment is verified.
    const earlyRelease = await request.post(
      `${API_URL}/clinical/lab-tests/orders/${order.id}/release`,
      { headers: auth },
    );
    expect(
      earlyRelease.ok(),
      "release should be blocked before payment",
    ).toBeFalsy();

    const payRes = await request.post(
      `${API_URL}/clinical/lab-tests/orders/${order.id}/payment`,
      { headers: auth, data: { paymentMethod: "CASH" } },
    );
    expect(payRes.ok(), `payment failed: ${payRes.status()}`).toBeTruthy();

    // Verifying payment auto-releases when a result is already uploaded.
    const queueRes = await request.get(`${API_URL}/clinical/lab-tests/queue`, {
      headers: auth,
    });
    expect(queueRes.ok(), `queue failed: ${queueRes.status()}`).toBeTruthy();
    const queue: Array<{ id: string; status: string }> = await queueRes.json();
    const released = queue.find((item) => item.id === order.id);
    expect(released?.status).toBe("COMPLETED");
  });
});
