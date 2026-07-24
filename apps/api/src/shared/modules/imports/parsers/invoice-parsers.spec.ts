import {
  extractInvoiceTotal,
  extractInvoiceTax,
  extractInvoiceDiscount,
  extractInvoiceSubtotal,
  extractInvoiceItems,
} from "./invoice-parsers";
import type { ParsedMedicalFields } from "@workspace/types";

function createEmptyFields(): ParsedMedicalFields {
  return {
    clinicName: "",
    doctorName: "",
    patientName: "",
    gender: "",
    dateOfBirth: "",
    visitDate: "",
    admissionDate: "",
    invoiceDate: "",
    mrn: "",
    phoneNumber: "",
    email: "",
    diagnosis: "",
    medications: [],
    vitals: { bp: "", temp: "", pulse: "", spO2: "" },
    labValues: { hemoglobin: "", glucose: "", creatinine: "" },
    emergencyContact: undefined,
    invoice: { total: 0, tax: 0, discount: 0, subtotal: 0, items: [] },
  };
}

describe("extractInvoiceTotal", () => {
  it("extracts total amount", () => {
    const fields = createEmptyFields();
    extractInvoiceTotal("Total: 1500.00", fields);
    expect(fields.invoice.total).toBe(1500);
  });

  it("extracts grand total with currency symbol", () => {
    const fields = createEmptyFields();
    extractInvoiceTotal("Grand Total: Rs. 2500", fields);
    expect(fields.invoice.total).toBe(2500);
  });

  it("extracts amount due with comma-separated number", () => {
    const fields = createEmptyFields();
    extractInvoiceTotal("Amount Due: 12,500.00", fields);
    expect(fields.invoice.total).toBe(12500);
  });

  it("does nothing when no total found", () => {
    const fields = createEmptyFields();
    extractInvoiceTotal("No total here", fields);
    expect(fields.invoice.total).toBe(0);
  });
});

describe("extractInvoiceTax", () => {
  it("extracts tax amount", () => {
    const fields = createEmptyFields();
    extractInvoiceTax("Tax: 180", fields);
    expect(fields.invoice.tax).toBe(180);
  });

  it("extracts GST with currency symbol", () => {
    const fields = createEmptyFields();
    extractInvoiceTax("GST: Rs. 360", fields);
    expect(fields.invoice.tax).toBe(360);
  });

  it("does nothing when no tax found", () => {
    const fields = createEmptyFields();
    extractInvoiceTax("No tax here", fields);
    expect(fields.invoice.tax).toBe(0);
  });
});

describe("extractInvoiceDiscount", () => {
  it("extracts discount amount", () => {
    const fields = createEmptyFields();
    extractInvoiceDiscount("Discount: 500", fields);
    expect(fields.invoice.discount).toBe(500);
  });

  it("does nothing when no discount found", () => {
    const fields = createEmptyFields();
    extractInvoiceDiscount("No discount here", fields);
    expect(fields.invoice.discount).toBe(0);
  });
});

describe("extractInvoiceSubtotal", () => {
  it("extracts subtotal amount", () => {
    const fields = createEmptyFields();
    extractInvoiceSubtotal("Subtotal: 3000.00", fields);
    expect(fields.invoice.subtotal).toBe(3000);
  });

  it("does nothing when no subtotal found", () => {
    const fields = createEmptyFields();
    extractInvoiceSubtotal("No subtotal here", fields);
    expect(fields.invoice.subtotal).toBe(0);
  });
});

describe("extractInvoiceItems", () => {
  it("extracts a simple line item", () => {
    const fields = createEmptyFields();
    extractInvoiceItems("Consultation Fee 500", "consultation fee 500", fields);
    expect(fields.invoice.items).toHaveLength(1);
    expect(fields.invoice.items[0]).toEqual({
      description: "Consultation Fee",
      quantity: 1,
      unitPrice: 500,
      total: 500,
    });
  });

  it("does not extract items that contain 'total'", () => {
    const fields = createEmptyFields();
    extractInvoiceItems("Total 1500", "total 1500", fields);
    expect(fields.invoice.items).toHaveLength(0);
  });

  it("does not extract items that contain 'subtotal'", () => {
    const fields = createEmptyFields();
    extractInvoiceItems("Subtotal 1500", "subtotal 1500", fields);
    expect(fields.invoice.items).toHaveLength(0);
  });

  it("does not extract items that contain 'discount'", () => {
    const fields = createEmptyFields();
    extractInvoiceItems("Discount 100", "discount 100", fields);
    expect(fields.invoice.items).toHaveLength(0);
  });
});
