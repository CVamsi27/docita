import { describe, expect, it } from "vitest";
import {
  isOutstandingUnpaidSubscriptionPaymentStatus,
  isPaidSubscriptionPaymentStatus,
  isPendingSubscriptionPaymentStatus,
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
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("paid")).toBe(
      false,
    );
    expect(isOutstandingUnpaidSubscriptionPaymentStatus("expired")).toBe(
      false,
    );
  });
});
