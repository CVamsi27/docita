import { describe, expect, it } from "vitest";
import {
  isRenewalUnpaidWithOutstandingPending,
  isSubscriptionBillingHardLocked,
  isSubscriptionPeriodLapsed,
} from "./subscription-lockout";

describe("subscription-lockout", () => {
  it("detects a lapsed billing period", () => {
    const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionPeriodLapsed(end)).toBe(true);
    expect(isSubscriptionPeriodLapsed(new Date(Date.now() + 86400000).toISOString())).toBe(
      false,
    );
  });

  it("requires both pending payment and lapsed period for renewal unpaid lock", () => {
    const lapsedEnd = new Date(Date.now() - 86400000).toISOString();
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        currentPeriodEnd: lapsedEnd,
      }),
    ).toBe(true);
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: false,
        currentPeriodEnd: lapsedEnd,
      }),
    ).toBe(false);
  });

  it("hard locks active clinics when renewal is unpaid after period end", () => {
    const lapsedEnd = new Date(Date.now() - 86400000).toISOString();
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "ACTIVE", subscriptionGraceUntil: null },
        { hasOutstandingPendingPayment: true, currentPeriodEnd: lapsedEnd },
      ),
    ).toBe(true);
  });
});
