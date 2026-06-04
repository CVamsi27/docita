import { describe, expect, it } from "vitest";
import {
  isFailedSubscriptionPaymentStatus,
  isOutstandingUnpaidSubscriptionPaymentStatus,
  isPaidSubscriptionPaymentStatus,
  isPendingSubscriptionPaymentStatus,
  isSubscriptionBillingRowPaid,
  isTerminalClosedSubscriptionPaymentStatus,
  normalizeSubscriptionPaymentStatus,
  resolveSubscriptionBillingAmountCents,
} from "./subscription-payment-status.js";

describe("subscription-payment-status", () => {
  it("normalizes missing and padded subscription payment status values", () => {
    expect(normalizeSubscriptionPaymentStatus(undefined)).toBe("");
    expect(normalizeSubscriptionPaymentStatus(null)).toBe("");
    expect(normalizeSubscriptionPaymentStatus("  SUCCEEDED  ")).toBe(
      "succeeded",
    );
  });

  it("treats pending variants as unpaid", () => {
    expect(isPendingSubscriptionPaymentStatus("pending")).toBe(true);
    expect(isPendingSubscriptionPaymentStatus("created")).toBe(true);
    expect(isPendingSubscriptionPaymentStatus("requires_action")).toBe(true);
    expect(isPendingSubscriptionPaymentStatus("attempted")).toBe(true);
    expect(isPendingSubscriptionPaymentStatus("due")).toBe(true);
    expect(isPendingSubscriptionPaymentStatus("PENDING")).toBe(false);
    expect(
      isOutstandingUnpaidSubscriptionPaymentStatus(" PENDING "),
    ).toBe(true);
    expect(
      isOutstandingUnpaidSubscriptionPaymentStatus("processing"),
    ).toBe(true);
  });

  it("classifies failed and terminal closed statuses", () => {
    expect(isFailedSubscriptionPaymentStatus("failed")).toBe(true);
    expect(isFailedSubscriptionPaymentStatus("declined")).toBe(true);
    expect(isFailedSubscriptionPaymentStatus("pending")).toBe(false);
    expect(isTerminalClosedSubscriptionPaymentStatus("refunded")).toBe(true);
    expect(isTerminalClosedSubscriptionPaymentStatus("void")).toBe(true);
    expect(isTerminalClosedSubscriptionPaymentStatus("voided")).toBe(true);
    expect(isTerminalClosedSubscriptionPaymentStatus("failed")).toBe(false);
  });

  it("does not treat paid, terminal, blank, or expired statuses as outstanding unpaid", () => {
    expect(isPaidSubscriptionPaymentStatus("paid")).toBe(true);
    expect(isPaidSubscriptionPaymentStatus("captured")).toBe(true);
    expect(isPaidSubscriptionPaymentStatus("succeeded")).toBe(true);
    expect(isPaidSubscriptionPaymentStatus("pending")).toBe(false);
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("paid")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("captured")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("succeeded")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("expired")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("refunded")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("voided")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus(undefined)).toBe(
      false,
    );
  });

  it("treats paidAt as settled even when status is legacy SUCCEEDED", () => {
    expect(
      isSubscriptionBillingRowPaid("succeeded", "2026-05-28T00:00:00.000Z"),
    ).toBe(true);
    expect(
      isSubscriptionBillingRowPaid("pending", "2026-05-28T00:00:00.000Z"),
    ).toBe(true);
    expect(isSubscriptionBillingRowPaid(" captured ", null)).toBe(true);
    expect(isSubscriptionBillingRowPaid("pending", null)).toBe(false);
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
    expect(
      resolveSubscriptionBillingAmountCents({
        amountCents: -1,
        grandTotalCents: -1,
        amount: -1,
      }),
    ).toBe(0);
    expect(resolveSubscriptionBillingAmountCents({})).toBe(0);
  });
});
