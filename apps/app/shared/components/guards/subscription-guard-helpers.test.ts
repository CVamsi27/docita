import { describe, expect, it } from "vitest";
import { resolveSubscriptionGuardRedirect } from "./subscription-guard-helpers";

const PAST = new Date(Date.now() - 86400000).toISOString();
const FUTURE = new Date(Date.now() + 86400000).toISOString();
// Trial grace period is 3 days (TRIAL_GRACE_DAYS) — go well past it for a fully-expired trial.
const TRIAL_GRACE_EXPIRED = new Date(Date.now() - 5 * 86400000).toISOString();

describe("resolveSubscriptionGuardRedirect", () => {
  it("returns null when there is no clinic", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: null,
        subscription: null,
        userRole: "ADMIN",
        pathname: "/dashboard",
      }),
    ).toBeNull();
  });

  it("redirects non-admins to /billing-locked once past the grace deadline", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "PAST_DUE", subscriptionGraceUntil: PAST, trialEndsAt: null },
        subscription: null,
        userRole: "DOCTOR",
        pathname: "/dashboard",
      }),
    ).toBe("/billing-locked");
  });

  it("sends billing admins to the billing resolve path instead of /billing-locked", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "PAST_DUE", subscriptionGraceUntil: PAST, trialEndsAt: null },
        subscription: null,
        userRole: "ADMIN",
        pathname: "/dashboard",
      }),
    ).toBe("/settings?tab=subscription&resolvePayment=1");
  });

  it("does not redirect a billing admin already on an allowed path", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "PAST_DUE", subscriptionGraceUntil: PAST, trialEndsAt: null },
        subscription: null,
        userRole: "ADMIN",
        pathname: "/settings",
      }),
    ).toBeNull();
  });

  it("redirects to /billing-locked once a trial has fully expired", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "TRIALING", subscriptionGraceUntil: null, trialEndsAt: TRIAL_GRACE_EXPIRED },
        subscription: null,
        userRole: "DOCTOR",
        pathname: "/dashboard",
      }),
    ).toBe("/billing-locked");
  });

  it("sends an EXPIRED subscription to the billing resolve path", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "EXPIRED", subscriptionGraceUntil: null, trialEndsAt: null },
        subscription: null,
        userRole: "DOCTOR",
        pathname: "/dashboard",
      }),
    ).toBe("/settings?tab=subscription&resolvePayment=1");
  });

  it("does not redirect when already on an allowed path while blocked", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "EXPIRED", subscriptionGraceUntil: null, trialEndsAt: null },
        subscription: null,
        userRole: "DOCTOR",
        pathname: "/login",
      }),
    ).toBeNull();
  });

  it("returns null for an active, in-grace subscription", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "ACTIVE", subscriptionGraceUntil: null, trialEndsAt: null },
        subscription: null,
        userRole: "DOCTOR",
        pathname: "/dashboard",
      }),
    ).toBeNull();
  });

  it("returns null for an active trial", () => {
    expect(
      resolveSubscriptionGuardRedirect({
        clinic: { subscriptionStatus: "TRIALING", subscriptionGraceUntil: null, trialEndsAt: FUTURE },
        subscription: null,
        userRole: "DOCTOR",
        pathname: "/dashboard",
      }),
    ).toBeNull();
  });
});
