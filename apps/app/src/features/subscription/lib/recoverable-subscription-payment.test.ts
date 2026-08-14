import { describe, expect, it } from "vitest";
import type { SubscriptionBillingPaymentHistoryItem } from "@workspace/types";
import { findRecoverableSubscriptionPayment } from "./recoverable-subscription-payment";

function item(
  overrides: Partial<SubscriptionBillingPaymentHistoryItem>,
): SubscriptionBillingPaymentHistoryItem {
  return {
    id: "pay_1",
    amountCents: 1000,
    currency: "INR",
    status: "paid",
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("findRecoverableSubscriptionPayment", () => {
  it("returns null for empty or undefined history", () => {
    expect(findRecoverableSubscriptionPayment(undefined)).toBeNull();
    expect(findRecoverableSubscriptionPayment([])).toBeNull();
  });

  it("returns the first recoverable status payment", () => {
    const invoices = [
      item({ id: "pay_paid", status: "paid" }),
      item({ id: "pay_failed", status: "failed" }),
      item({ id: "pay_pending", status: "pending" }),
    ];
    expect(findRecoverableSubscriptionPayment(invoices)?.id).toBe("pay_failed");
  });

  it("matches recoverable statuses case-insensitively", () => {
    const invoices = [item({ id: "pay_1", status: "FAILED" })];
    expect(findRecoverableSubscriptionPayment(invoices)?.id).toBe("pay_1");
  });

  it("returns null when every payment is settled", () => {
    const invoices = [
      item({ status: "paid" }),
      item({ status: "refunded" }),
      item({ status: "succeeded" }),
    ];
    expect(findRecoverableSubscriptionPayment(invoices)).toBeNull();
  });
});
