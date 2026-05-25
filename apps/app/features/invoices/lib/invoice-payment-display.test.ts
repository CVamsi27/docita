import { describe, expect, it } from "vitest";
import {
  buildInvoicePaidSummaryLine,
  formatInvoicePaymentMethodLabel,
} from "./invoice-payment-display";

const formatDate = (value: string | Date | null | undefined): string =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

describe("formatInvoicePaymentMethodLabel", () => {
  it("maps known methods", () => {
    expect(formatInvoicePaymentMethodLabel("upi")).toBe("UPI");
    expect(formatInvoicePaymentMethodLabel("cash")).toBe("Cash");
  });
});

describe("buildInvoicePaidSummaryLine", () => {
  it("returns null for pending", () => {
    expect(
      buildInvoicePaidSummaryLine({
        status: "PENDING",
        paidAt: null,
        paymentMethod: "upi",
        formatDate,
      }),
    ).toBeNull();
  });

  it("joins paid date and method", () => {
    const line = buildInvoicePaidSummaryLine({
      status: "PAID",
      paidAt: "2026-05-05T10:00:00.000Z",
      paymentMethod: "upi",
      formatDate,
    });
    expect(line).toMatch(/Paid/);
    expect(line).toMatch(/UPI/);
  });
});
