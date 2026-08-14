import { describe, expect, it } from "vitest";
import {
  buildInvoicePaidSummaryLine,
  formatInvoicePaymentMethodLabel,
} from "./invoice-payment-display";
import { createEnMessageResolver } from "@/test-utils/en-message-resolver";

const t = createEnMessageResolver("Invoices");

const formatDate = (value: string | Date | null | undefined): string =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

describe("formatInvoicePaymentMethodLabel", () => {
  it("maps known methods", () => {
    expect(formatInvoicePaymentMethodLabel("upi", t)).toBe("UPI");
    expect(formatInvoicePaymentMethodLabel("cash", t)).toBe("Cash");
  });
});

describe("buildInvoicePaidSummaryLine", () => {
  it("returns null for pending", () => {
    expect(
      buildInvoicePaidSummaryLine(
        {
          status: "PENDING",
          paidAt: null,
          paymentMethod: "upi",
          formatDate,
        },
        t,
      ),
    ).toBeNull();
  });

  it("joins paid date and method", () => {
    const line = buildInvoicePaidSummaryLine(
      {
        status: "PAID",
        paidAt: "2026-05-05T10:00:00.000Z",
        paymentMethod: "upi",
        formatDate,
      },
      t,
    );
    expect(line).toMatch(/Paid/);
    expect(line).toMatch(/UPI/);
  });
});
