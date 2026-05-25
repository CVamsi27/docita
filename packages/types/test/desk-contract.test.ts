import { describe, expect, it } from "vitest";
import { markInvoicePaidRequestSchema } from "../src/contracts/billing";
import { deskRecordInvoiceSettlementBodySchema } from "../src/contracts/desk";

describe("deskRecordInvoiceSettlementBodySchema", () => {
  it("matches mark-invoice-paid body shape", () => {
    expect(deskRecordInvoiceSettlementBodySchema).toBe(
      markInvoicePaidRequestSchema,
    );
  });

  it("parses desk settlement payloads", () => {
    const parsed = deskRecordInvoiceSettlementBodySchema.parse({
      paymentMethod: "CASH",
      reference: "abc",
    });
    expect(parsed.paymentMethod).toBe("CASH");
    expect(parsed.reference).toBe("abc");
  });
});
