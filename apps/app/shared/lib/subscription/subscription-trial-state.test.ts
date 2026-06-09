import { describe, expect, it } from "vitest";
import { getTrialState, getTrialGraceEndsAt } from "./subscription-trial-state";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("getTrialState", () => {
  it("returns null when clinic is null or undefined", () => {
    expect(getTrialState(null)).toBeNull();
    expect(getTrialState(undefined)).toBeNull();
  });

  it("returns null when subscriptionStatus is not TRIALING", () => {
    expect(
      getTrialState({ subscriptionStatus: "ACTIVE", trialEndsAt: null }),
    ).toBeNull();
    expect(
      getTrialState({ subscriptionStatus: "CANCELED", trialEndsAt: null }),
    ).toBeNull();
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: null,
      }),
    ).toBe("ACTIVE");
  });

  it("returns ACTIVE when trialEndsAt is null", () => {
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: null,
      }),
    ).toBe("ACTIVE");
  });

  it("returns ACTIVE when trial has not ended yet", () => {
    const future = new Date(Date.now() + 7 * DAY_MS);
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: future,
      }),
    ).toBe("ACTIVE");
  });

  it("returns GRACE when trialEndsAt is exactly now", () => {
    const now = new Date();
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: now,
      }),
    ).toBe("GRACE");
  });

  it("returns GRACE when within grace period after trial end", () => {
    const justEnded = new Date(Date.now() - DAY_MS);
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: justEnded,
      }),
    ).toBe("GRACE");
  });

  it("returns EXPIRED when past grace period", () => {
    const longAgo = new Date(Date.now() - 10 * DAY_MS);
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: longAgo,
      }),
    ).toBe("EXPIRED");
  });

  it("treats invalid Date objects as null (returns ACTIVE)", () => {
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: new Date("invalid"),
      }),
    ).toBe("ACTIVE");
  });

  it("parses string trialEndsAt", () => {
    const futureStr = new Date(Date.now() + 7 * DAY_MS).toISOString();
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: futureStr,
      }),
    ).toBe("ACTIVE");
  });

  it("returns GRACE exactly at trialEnd + GRACE_DAYS boundary (edge)", () => {
    const brink = new Date(Date.now() - 2 * DAY_MS);
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: brink,
      }),
    ).toBe("GRACE");
  });

  it("returns EXPIRED exactly past trialEnd + GRACE_DAYS boundary", () => {
    const brink = new Date(Date.now() - 3 * DAY_MS - 1);
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: brink,
      }),
    ).toBe("EXPIRED");
  });

  it("handles invalid date string as null (returns ACTIVE)", () => {
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: "not-a-real-date",
      }),
    ).toBe("ACTIVE");
  });

  it("handles trialEndsAt as a number (non-Date, non-string) as null (returns ACTIVE)", () => {
    expect(
      getTrialState({
        subscriptionStatus: "TRIALING",
        trialEndsAt: 1234567890 as unknown as Date,
      }),
    ).toBe("ACTIVE");
  });
});

describe("getTrialGraceEndsAt", () => {
  it("returns null when clinic is null or undefined", () => {
    expect(getTrialGraceEndsAt(null)).toBeNull();
    expect(getTrialGraceEndsAt(undefined)).toBeNull();
  });

  it("returns null when trialEndsAt is null", () => {
    expect(getTrialGraceEndsAt({ trialEndsAt: null })).toBeNull();
  });

  it("returns trial end + grace days for a Date", () => {
    const base = new Date("2026-06-01T00:00:00Z");
    const expected = new Date(base.getTime() + 3 * DAY_MS);
    expect(getTrialGraceEndsAt({ trialEndsAt: base })).toEqual(expected);
  });

  it("returns trial end + grace days for a string", () => {
    const base = "2026-06-01T00:00:00Z";
    const expected = new Date(new Date(base).getTime() + 3 * DAY_MS);
    expect(getTrialGraceEndsAt({ trialEndsAt: base })).toEqual(expected);
  });

  it("returns null when trialEndsAt is an invalid Date object", () => {
    expect(getTrialGraceEndsAt({ trialEndsAt: new Date("invalid") })).toBeNull();
  });

  it("returns null when trialEndsAt is an unparseable string", () => {
    expect(getTrialGraceEndsAt({ trialEndsAt: "not-a-date" })).toBeNull();
  });

  it("returns null when trialEndsAt is a number (non-Date, non-string)", () => {
    expect(getTrialGraceEndsAt({ trialEndsAt: 1234567890 as unknown as Date })).toBeNull();
  });
});
