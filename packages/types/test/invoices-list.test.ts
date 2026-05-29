import { describe, expect, it } from "vitest";
import { invoiceListRowSchema } from "../src/billing/invoices";

describe("invoiceListRowSchema", () => {
  it("parses list rows with partial patient summary from GET /invoices", () => {
    const row = invoiceListRowSchema.parse({
      id: "inv-1",
      clinicId: "clinic-1",
      total: 500,
      grandTotal: 500,
      status: "PENDING",
      items: [{ description: "Consultation", quantity: 1, unitPrice: 500 }],
      createdAt: "2025-01-15T10:00:00.000Z",
      patient: {
        id: "patient-1",
        firstName: "Ada",
        lastName: "Lovelace",
        phoneNumber: null,
      },
    });

    expect(row.patientId).toBe("patient-1");
    expect(row.patient?.firstName).toBe("Ada");
    expect(row.items[0]?.price).toBe(500);
  });
});
