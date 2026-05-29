import { describe, expect, it } from "vitest";
import {
  isOutstandingUnpaidSubscriptionPaymentStatus,
  isPaidSubscriptionPaymentStatus,
  isPendingSubscriptionPaymentStatus,
  isSubscriptionBillingRowPaid,
  resolveSubscriptionBillingAmountCents,
} from "./subscription-payment-status.js";

describe("subscription-payment-status", () => {
  it("treats pending variants as unpaid", () => {
    expect(isPendingSubscriptionPaymentStatus("pending")).toBe(true);
    expect(isPendingSubscriptionPaymentStatus("PENDING")).toBe(false);
    expect(
      isOutstandingUnpaidSubscriptionPaymentStatus("pending"),
    ).toBe(true);
    expect(
      isOutstandingUnpaidSubscriptionPaymentStatus("processing"),
    ).toBe(true);
  });

  it("does not treat paid or expired as outstanding unpaid", () => {
    expect(isPaidSubscriptionPaymentStatus("paid")).toBe(true);
    expect(isPaidSubscriptionPaymentStatus("captured")).toBe(true);
    expect(isPaidSubscriptionPaymentStatus("succeeded")).toBe(true);
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("paid")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("succeeded")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("expired")).toBe(
      false,
    );
  });

  it("treats paidAt as settled even when status is legacy SUCCEEDED", () => {
    expect(
      isSubscriptionBillingRowPaid("succeeded", "2026-05-28T00:00:00.000Z"),
    ).toBe(true);
    expect(isSubscriptionBillingRowPaid("pending", "2026-05-28T00:00:00.000Z")).toBe(
      true,
    );
  });

  it("resolves billing amount from grand total, cents, or legacy amount", () => {
    expect(
      resolveSubscriptionBillingAmountCents({
        amountCents: 0,
        grandTotalCents: 24000000,
        amount: 240000,
      }),
    ).toBe(24000000);
    expect(
      resolveSubscriptionBillingAmountCents({
        amountCents: 99900,
        amount: 999,
      }),
    ).toBe(99900);
    expect(
      resolveSubscriptionBillingAmountCents({
        amountCents: 0,
        amount: 240000,
      }),
    ).toBe(24000000);
  });
});
