import { afterEach, describe, expect, it, vi } from "vitest";
import type { SubscriptionLike } from "./billing-subscription-types";
import { getDisplayBillingPeriodEndAndDaysLeft } from "./billing-period-display";

afterEach(() => {
  vi.useRealTimers();
});

describe("getDisplayBillingPeriodEndAndDaysLeft", () => {
  it("returns nulls when subscription or currentPeriodEnd is missing", () => {
    expect(getDisplayBillingPeriodEndAndDaysLeft(null)).toEqual({
      periodEnd: null,
      daysLeft: null,
    });
    expect(getDisplayBillingPeriodEndAndDaysLeft(undefined)).toEqual({
      periodEnd: null,
      daysLeft: null,
    });
    expect(getDisplayBillingPeriodEndAndDaysLeft({} as SubscriptionLike)).toEqual({
      periodEnd: null,
      daysLeft: null,
    });
    expect(
      getDisplayBillingPeriodEndAndDaysLeft({
        currentPeriodEnd: null,
      } as SubscriptionLike),
    ).toEqual({ periodEnd: null, daysLeft: null });
  });

  it("computes whole days remaining to the period end", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

    const result = getDisplayBillingPeriodEndAndDaysLeft({
      currentPeriodEnd: "2026-01-20T00:00:00Z",
    } as SubscriptionLike);

    expect(result.periodEnd?.toISOString()).toBe("2026-01-20T00:00:00.000Z");
    expect(result.daysLeft).toBe(5);
  });

  it("clamps negative days to zero for expired periods", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));

    const result = getDisplayBillingPeriodEndAndDaysLeft({
      currentPeriodEnd: "2026-01-01T00:00:00Z",
    } as SubscriptionLike);

    expect(result.daysLeft).toBe(0);
  });
});
