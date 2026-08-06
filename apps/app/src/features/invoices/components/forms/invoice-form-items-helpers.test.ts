import { describe, expect, it } from "vitest";
import { computeInvoiceItems } from "./invoice-form-items-helpers";

describe("computeInvoiceItems", () => {
  const fields = [{ id: "a" }, { id: "b" }];

  it("coerces string number fields the way the RHF watch can produce them", () => {
    const items = computeInvoiceItems(fields, [
      { quantity: "2", price: "250", taxRate: "5" },
      {},
    ]);

    expect(items[0].quantity).toBe(2);
    expect(items[0].unitPrice).toBe(250);
    expect(items[0].taxRate).toBe(5);
    expect(items[0].total).toBe(500);
  });

  it("falls back to zero for missing, null, or empty number fields", () => {
    const items = computeInvoiceItems(fields, [
      { quantity: "", price: null, taxRate: undefined },
      { quantity: 0, price: 0 },
    ]);

    expect(items[0].quantity).toBe(0);
    expect(items[0].unitPrice).toBe(0);
    expect(items[0].taxRate).toBe(0);
    expect(items[1].total).toBe(0);
  });

  it("defaults taxTreatment and string fields", () => {
    const items = computeInvoiceItems(fields, [
      { description: "Consultation", taxTreatment: "" },
      { hsnCode: "1234", sacCode: "" },
    ]);

    expect(items[0].description).toBe("Consultation");
    expect(items[0].taxTreatment).toBe("EXEMPT_HEALTHCARE");
    expect(items[1].description).toBe("");
    expect(items[1].hsnCode).toBe("1234");
    expect(items[1].sacCode).toBe("");
  });

  it("applies tax only for TAXABLE treatment", () => {
    const items = computeInvoiceItems(fields, [
      { quantity: 2, price: 100, taxTreatment: "TAXABLE", taxRate: 10 },
      { quantity: 2, price: 100, taxTreatment: "EXEMPT_HEALTHCARE", taxRate: 10 },
    ]);

    expect(items[0].total).toBe(220);
    expect(items[1].total).toBe(200);
  });

  it("treats non-record watched items as empty", () => {
    const items = computeInvoiceItems(fields, [null, "not-an-object"]);

    expect(items[0].total).toBe(0);
    expect(items[1].quantity).toBe(0);
  });
});
