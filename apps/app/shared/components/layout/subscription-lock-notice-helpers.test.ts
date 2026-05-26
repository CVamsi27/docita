import { describe, expect, it } from "vitest";
import { resolveSubscriptionLockNotice } from "./subscription-lock-notice-helpers";

describe("resolveSubscriptionLockNotice", () => {
  it("shows renewal pending copy when period lapsed with outstanding pending payment", () => {
    const copy = resolveSubscriptionLockNotice(
      {
        subscriptionStatus: "ACTIVE",
        tier: "ESSENTIAL",
        trialEndsAt: null,
        subscriptionGraceUntil: null,
      },
      {
        hasOutstandingPendingPayment: true,
        currentPeriodEnd: "2026-05-17T23:59:59.999Z",
      },
    );

    expect(copy?.kind).toBe("payment-required");
    expect(copy?.ctaLabel).toBe("Pay now");
  });

  it("returns null for active clinics without billing issues", () => {
    expect(
      resolveSubscriptionLockNotice({
        subscriptionStatus: "ACTIVE",
        tier: "ESSENTIAL",
        trialEndsAt: null,
        subscriptionGraceUntil: null,
      }),
    ).toBeNull();
  });

  it("shows expired workspace lock for expired subscriptions", () => {
    const copy = resolveSubscriptionLockNotice({
      subscriptionStatus: "EXPIRED",
      tier: "ESSENTIAL",
      trialEndsAt: null,
      subscriptionGraceUntil: null,
    });

    expect(copy?.kind).toBe("expired");
    expect(copy?.ctaLabel).toBe("Resolve Payment");
  });
});
