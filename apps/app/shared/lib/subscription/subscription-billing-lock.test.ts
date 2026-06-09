import { describe, expect, it } from "vitest";
import {
  isRenewalUnpaidWithOutstandingPending,
  isSubscriptionBillingHardLocked,
  isSubscriptionPeriodLapsed,
} from "./subscription-billing-lock";

describe("isSubscriptionPeriodLapsed", () => {
  it("returns true when currentPeriodEnd is in the past", () => {
    const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(isSubscriptionPeriodLapsed(end)).toBe(true);
  });

  it("returns false when currentPeriodEnd is in the future", () => {
    expect(isSubscriptionPeriodLapsed(new Date(Date.now() + 86400000).toISOString())).toBe(false);
  });

  it("returns false for null or undefined", () => {
    expect(isSubscriptionPeriodLapsed(null)).toBe(false);
    expect(isSubscriptionPeriodLapsed(undefined)).toBe(false);
  });

  it("returns false for an invalid Date string", () => {
    expect(isSubscriptionPeriodLapsed("not-a-date")).toBe(false);
  });

  it("returns false for an invalid Date object", () => {
    expect(isSubscriptionPeriodLapsed(new Date("invalid"))).toBe(false);
  });

  it("accepts a Date object directly", () => {
    const pastDate = new Date(Date.now() - 86400000);
    expect(isSubscriptionPeriodLapsed(pastDate, pastDate.getTime() + 1)).toBe(true);
  });

  it("uses Date.now() as default now", () => {
    const future = new Date(Date.now() + 86400000);
    expect(isSubscriptionPeriodLapsed(future)).toBe(false);
  });
});

describe("isRenewalUnpaidWithOutstandingPending", () => {
  it("returns true when both conditions are met", () => {
    const lapsedEnd = new Date(Date.now() - 86400000).toISOString();
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        currentPeriodEnd: lapsedEnd,
      }),
    ).toBe(true);
  });

  it("returns false when hasOutstandingPendingPayment is false", () => {
    const lapsedEnd = new Date(Date.now() - 86400000).toISOString();
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: false,
        currentPeriodEnd: lapsedEnd,
      }),
    ).toBe(false);
  });

  it("returns false when currentPeriodEnd is null even with pending payment", () => {
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        currentPeriodEnd: null,
      }),
    ).toBe(false);
  });

  it("returns false when currentPeriodEnd is undefined even with pending payment", () => {
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        currentPeriodEnd: undefined,
      }),
    ).toBe(false);
  });

  it("returns false when currentPeriodEnd is in the future even with pending payment", () => {
    const futureEnd = new Date(Date.now() + 86400000).toISOString();
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        currentPeriodEnd: futureEnd,
      }),
    ).toBe(false);
  });

  it("accepts custom now parameter", () => {
    const pastEnd = new Date(Date.now() - 86400000).toISOString();
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        currentPeriodEnd: pastEnd,
        now: Date.now(),
      }),
    ).toBe(true);
  });
});

describe("isSubscriptionBillingHardLocked", () => {
  it("locks when grace deadline is past", () => {
    const past = new Date(Date.now() - 86400000);
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "GRACE", subscriptionGraceUntil: past },
        { hasOutstandingPendingPayment: false, currentPeriodEnd: null },
        past.getTime() + 1,
      ),
    ).toBe(true);
  });

  it("locks when renewal is unpaid after period end", () => {
    const lapsedEnd = new Date(Date.now() - 86400000).toISOString();
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "ACTIVE", subscriptionGraceUntil: null },
        { hasOutstandingPendingPayment: true, currentPeriodEnd: lapsedEnd },
      ),
    ).toBe(true);
  });

  it("returns false when clinic is null", () => {
    expect(
      isSubscriptionBillingHardLocked(null, { hasOutstandingPendingPayment: true, currentPeriodEnd: null }),
    ).toBe(false);
  });

  it("returns false when billing is null or undefined", () => {
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "ACTIVE", subscriptionGraceUntil: null },
        null,
      ),
    ).toBe(false);
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "ACTIVE", subscriptionGraceUntil: null },
        undefined,
      ),
    ).toBe(false);
  });

  it("returns false when no lock conditions are met", () => {
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "ACTIVE", subscriptionGraceUntil: null },
        { hasOutstandingPendingPayment: false, currentPeriodEnd: new Date(Date.now() + 86400000).toISOString() },
      ),
    ).toBe(false);
  });

  it("grace deadline takes priority over billing lock", () => {
    const past = new Date(Date.now() - 86400000);
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "PAST_DUE", subscriptionGraceUntil: past },
        { hasOutstandingPendingPayment: false, currentPeriodEnd: null },
        past.getTime() + 1,
      ),
    ).toBe(true);
  });

  it("uses default now parameter", () => {
    const future = new Date(Date.now() + 86400000);
    expect(
      isSubscriptionBillingHardLocked(
        { subscriptionStatus: "GRACE", subscriptionGraceUntil: future },
        { hasOutstandingPendingPayment: false, currentPeriodEnd: null },
      ),
    ).toBe(false);
  });
});
