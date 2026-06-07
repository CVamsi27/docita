import { describe, expect, it } from "vitest";
import { isBillingAdminRole, isPastSubscriptionGraceDeadline } from "./subscription-lockout";

describe("isPastSubscriptionGraceDeadline", () => {
  it("returns false when clinic is null or undefined", () => {
    expect(isPastSubscriptionGraceDeadline(null)).toBe(false);
    expect(isPastSubscriptionGraceDeadline(undefined)).toBe(false);
  });

  it("returns false when subscriptionGraceUntil is null", () => {
    expect(
      isPastSubscriptionGraceDeadline({ subscriptionStatus: "GRACE", subscriptionGraceUntil: null }),
    ).toBe(false);
  });

  it("returns false when subscriptionStatus is not GRACE or PAST_DUE", () => {
    expect(
      isPastSubscriptionGraceDeadline({
        subscriptionStatus: "ACTIVE",
        subscriptionGraceUntil: new Date(Date.now() - 86400000).toISOString(),
      }),
    ).toBe(false);
    expect(
      isPastSubscriptionGraceDeadline({
        subscriptionStatus: "TRIALING",
        subscriptionGraceUntil: new Date(Date.now() - 86400000).toISOString(),
      }),
    ).toBe(false);
    expect(
      isPastSubscriptionGraceDeadline({
        subscriptionStatus: "CANCELED",
        subscriptionGraceUntil: new Date(Date.now() - 86400000).toISOString(),
      }),
    ).toBe(false);
  });

  it("returns true when GRACE status and past the deadline", () => {
    const past = new Date(Date.now() - 86400000);
    expect(
      isPastSubscriptionGraceDeadline(
        { subscriptionStatus: "GRACE", subscriptionGraceUntil: past },
        past.getTime() + 1,
      ),
    ).toBe(true);
  });

  it("returns false when GRACE status and before the deadline", () => {
    const future = new Date(Date.now() + 86400000);
    expect(
      isPastSubscriptionGraceDeadline(
        { subscriptionStatus: "GRACE", subscriptionGraceUntil: future },
        Date.now(),
      ),
    ).toBe(false);
  });

  it("returns true when PAST_DUE status and past the deadline", () => {
    const past = new Date(Date.now() - 86400000);
    expect(
      isPastSubscriptionGraceDeadline(
        { subscriptionStatus: "PAST_DUE", subscriptionGraceUntil: past },
        past.getTime() + 1,
      ),
    ).toBe(true);
  });

  it("returns false when subscriptionGraceUntil is an invalid Date", () => {
    expect(
      isPastSubscriptionGraceDeadline({
        subscriptionStatus: "GRACE",
        subscriptionGraceUntil: new Date("invalid"),
      }),
    ).toBe(false);
  });

  it("returns false when subscriptionGraceUntil is an unparseable string", () => {
    expect(
      isPastSubscriptionGraceDeadline({
        subscriptionStatus: "GRACE",
        subscriptionGraceUntil: "not-a-date",
      }),
    ).toBe(false);
  });

  it("uses Date.now() as default now", () => {
    const future = new Date(Date.now() + 86400000);
    expect(
      isPastSubscriptionGraceDeadline({
        subscriptionStatus: "GRACE",
        subscriptionGraceUntil: future,
      }),
    ).toBe(false);
  });
});

describe("isBillingAdminRole", () => {
  it("returns true for ADMIN", () => {
    expect(isBillingAdminRole("ADMIN")).toBe(true);
  });

  it("returns true for ADMIN_DOCTOR", () => {
    expect(isBillingAdminRole("ADMIN_DOCTOR")).toBe(true);
  });

  it("returns false for RECEPTIONIST", () => {
    expect(isBillingAdminRole("RECEPTIONIST")).toBe(false);
  });

  it("returns false for DOCTOR", () => {
    expect(isBillingAdminRole("DOCTOR")).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isBillingAdminRole(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isBillingAdminRole("")).toBe(false);
  });
});
