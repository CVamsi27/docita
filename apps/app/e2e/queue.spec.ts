import { APIRequestContext, expect, test } from "@playwright/test";
import { z } from "zod";
import {
  enqueuePdfJobResponseSchema,
  pdfJobStatusResponseSchema,
  type PdfJobStatusResponse,
} from "@workspace/types";
import { setupTestUser } from "./utils/patient-helpers";

const API_URL = process.env["API_URL"] || "http://127.0.0.1:3001/api/v1";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

const idResponseSchema = z.object({
  id: z.string(),
});

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

async function createPatient(
  request: APIRequestContext,
  accessToken: string,
): Promise<string> {
  const response = await request.post(`${API_URL}/patients`, {
    headers: authHeaders(accessToken),
    data: {
      firstName: "Queue",
      lastName: `Patient-${Date.now()}`,
      dateOfBirth: "1990-01-01",
      gender: "MALE",
      phoneNumber: `9${Math.floor(Math.random() * 1e9)}`.padEnd(10, "0"),
    },
  });

  expect(response.ok()).toBeTruthy();
  return idResponseSchema.parse(await response.json()).id;
}

async function createAppointment(
  request: APIRequestContext,
  accessToken: string,
  patientId: string,
  doctorId: string,
  clinicId: string,
): Promise<string> {
  const startTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const endTime = new Date(Date.now() + 45 * 60 * 1000).toISOString();

  const response = await request.post(`${API_URL}/appointments`, {
    headers: authHeaders(accessToken),
    data: {
      patientId,
      doctorId,
      clinicId,
      startTime,
      endTime,
      status: "scheduled",
      type: "consultation",
    },
  });

  expect(response.ok()).toBeTruthy();
  return idResponseSchema.parse(await response.json()).id;
}

async function createInvoice(
  request: APIRequestContext,
  accessToken: string,
  patientId: string,
): Promise<string> {
  const response = await request.post(`${API_URL}/invoices`, {
    headers: authHeaders(accessToken),
    data: {
      patientId,
      total: 4200,
      status: "pending",
      doctorName: "Dr. Queue",
      items: [
        {
          description: "Consultation",
          quantity: 1,
          price: 4200,
        },
      ],
    },
  });

  expect(response.ok()).toBeTruthy();
  return idResponseSchema.parse(await response.json()).id;
}

async function createPrescription(
  request: APIRequestContext,
  accessToken: string,
  patientId: string,
  doctorId: string,
  appointmentId: string,
): Promise<string> {
  const response = await request.post(`${API_URL}/prescriptions`, {
    headers: authHeaders(accessToken),
    data: {
      patientId,
      doctorId,
      appointmentId,
      instructions: "Take after meals",
      medications: [
        {
          name: "Amoxicillin",
          dosage: "500mg",
          frequency: "Twice daily",
          duration: "7 days",
        },
      ],
    },
  });

  expect(response.ok()).toBeTruthy();
  return idResponseSchema.parse(await response.json()).id;
}

async function waitForPdfStatus(
  request: APIRequestContext,
  accessToken: string,
  resourcePath: "invoices" | "prescriptions",
  documentId: string,
  jobId: string,
): Promise<PdfJobStatusResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await request.get(
      `${API_URL}/${resourcePath}/${documentId}/pdf/status?jobId=${jobId}`,
      {
        headers: authHeaders(accessToken),
      },
    );

    expect(response.ok()).toBeTruthy();
    const status = pdfJobStatusResponseSchema.parse(await response.json());

    if (status.status === "COMPLETED") {
      expect(status.pdfUrl).toBeTruthy();
      return status;
    }

    if (status.status === "FAILED") {
      throw new Error(`PDF job ${jobId} failed`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for PDF job ${jobId}`);
}

test.describe.configure({ mode: "serial" });

test.describe("Async PDF queue", () => {
  let doctor: Awaited<ReturnType<typeof setupTestUser>>;
  let patientId: string;

  test.beforeAll(async ({ request }) => {
    doctor = await setupTestUser(request);
    patientId = await createPatient(request, doctor.accessToken);
  });

  test("enqueues and completes an invoice PDF job", async ({ request }) => {
    const invoiceId = await createInvoice(request, doctor.accessToken, patientId);

    const enqueueResponse = await request.get(
      `${API_URL}/invoices/${invoiceId}/pdf?async=true`,
      {
        headers: authHeaders(doctor.accessToken),
      },
    );

    expect(enqueueResponse.ok()).toBeTruthy();
    const enqueueResult = enqueuePdfJobResponseSchema.parse(
      await enqueueResponse.json(),
    );
    expect(enqueueResult.jobId).toBeTruthy();
    expect(enqueueResult.status).toBe("PENDING");

    const status = await waitForPdfStatus(
      request,
      doctor.accessToken,
      "invoices",
      invoiceId,
      enqueueResult.jobId,
    );

    expect(status.status).toBe("COMPLETED");
    expect(status.pdfUrl).toMatch(/^https?:\/\//);
  });

  test("enqueues and completes a prescription PDF job", async ({
    request,
  }) => {
    const appointmentId = await createAppointment(
      request,
      doctor.accessToken,
      patientId,
      doctor.id,
      doctor.clinicId,
    );
    const prescriptionId = await createPrescription(
      request,
      doctor.accessToken,
      patientId,
      doctor.id,
      appointmentId,
    );

    const enqueueResponse = await request.get(
      `${API_URL}/prescriptions/${prescriptionId}/pdf?async=true`,
      {
        headers: authHeaders(doctor.accessToken),
      },
    );

    expect(enqueueResponse.ok()).toBeTruthy();
    const enqueueResult = enqueuePdfJobResponseSchema.parse(
      await enqueueResponse.json(),
    );
    expect(enqueueResult.jobId).toBeTruthy();
    expect(enqueueResult.status).toBe("PENDING");

    const status = await waitForPdfStatus(
      request,
      doctor.accessToken,
      "prescriptions",
      prescriptionId,
      enqueueResult.jobId,
    );

    expect(status.status).toBe("COMPLETED");
    expect(status.pdfUrl).toMatch(/^https?:\/\//);
  });
});
