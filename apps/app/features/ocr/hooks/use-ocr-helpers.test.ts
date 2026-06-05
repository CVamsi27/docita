import { describe, expect, it } from "vitest";
import {
  buildInvoiceDraftForCommit,
  buildOcrFormData,
  buildOcrSavePayload,
  mapOcrFieldsToInvoiceForm,
  parseMoneyInput,
} from "./use-ocr-helpers";

describe("OCR helpers", () => {
  it("maps scanned invoice fields and computes totals", () => {
    expect(parseMoneyInput("1,250.50")).toBe(1250.5);
    expect(
      mapOcrFieldsToInvoiceForm({
        invoice: {
          subtotal: 100,
          tax: 18,
          items: [
            { description: "Consultation", quantity: 1, unitPrice: 100, total: 100 },
            { description: "", quantity: 1 },
          ],
        },
      }),
    ).toMatchObject({
      saveAsPending: false,
      grandTotal: "100",
      subtotal: "100",
      taxTotal: "18",
      items: expect.arrayContaining([
        {
          description: "Consultation",
          quantity: "1",
          unitPrice: "100",
          total: "100",
        },
      ]),
    });
  });

  it("builds commit payloads with parsed demographics and optional invoice drafts", () => {
    const formData = buildOcrFormData(
      {
        firstName: "Asha",
        lastName: "Rao",
        age: "42",
        gender: "FEMALE",
        diagnosis: "Fever",
        symptoms: ["fever"],
        allergies: [],
        medicalHistory: [],
        medications: [{ name: "Paracetamol", dosage: "500mg", frequency: "BD" }],
        vitals: { bp: "120/80", temp: "99", pulse: "78", respiratoryRate: "", spO2: "" },
        invoice: undefined,
      },
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "9999999999",
    );
    formData.invoice = {
      saveAsPending: true,
      grandTotal: "100",
      subtotal: "",
      taxTotal: "",
      items: [{ description: "Consultation", quantity: "1", unitPrice: "100", total: "" }],
    };

    expect(buildInvoiceDraftForCommit(formData.invoice)).toMatchObject({
      grandTotal: 100,
      items: [{ description: "Consultation", quantity: 1, unitPrice: 100, total: 100 }],
    });
    expect(
      buildOcrSavePayload(formData, "clinic-1", "doctor-1", true, true),
    ).toMatchObject({
      clinicId: "clinic-1",
      doctorId: "doctor-1",
      firstName: "Asha",
      gender: "FEMALE",
      acknowledgeReview: true,
      vitals: { systolicBP: 120, diastolicBP: 80, temperature: 99, pulse: 78 },
    });
  });
});
