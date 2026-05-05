import { describe, expect, it } from "vitest";
import { markInvoicePaidRequestSchema } from "../src/contracts/billing";

describe("markInvoicePaidRequestSchema", () => {
  it("defaults payment method to CASH", () => {
    const parsed = markInvoicePaidRequestSchema.parse({});
    expect(parsed.paymentMethod).toBe("CASH");
  });

  it("accepts reception channels", () => {
    const parsed = markInvoicePaidRequestSchema.parse({
      paymentMethod: "PINELABS",
      reference: "TID-99",
    });
    expect(parsed.paymentMethod).toBe("PINELABS");
    expect(parsed.reference).toBe("TID-99");
  });

  it("strips HTML from notes and reference", () => {
    const parsed = markInvoicePaidRequestSchema.parse({
      notes: "<b>ok</b>",
      reference: "<em></em>ref1",
    });
    expect(parsed.notes).toBe("ok");
    expect(parsed.reference).toBe("ref1");
  });

  it("maps empty strings to undefined for optional strings", () => {
    const parsed = markInvoicePaidRequestSchema.parse({
      notes: "",
      reference: "",
    });
    expect(parsed.notes).toBeUndefined();
    expect(parsed.reference).toBeUndefined();
  });

  it("accepts legacy OTHER payment method", () => {
    const parsed = markInvoicePaidRequestSchema.parse({
      paymentMethod: "OTHER",
    });
    expect(parsed.paymentMethod).toBe("OTHER");
  });
});
