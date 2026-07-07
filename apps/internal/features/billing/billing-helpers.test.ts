import { describe, expect, it } from "vitest";
import {
  buildSubscriptionFilters,
  deriveSubscriptionPageStatus,
} from "./billing-helpers";

describe("buildSubscriptionFilters", () => {
  it("drops 'all' sentinels and produces a stable filters key", () => {
    const { filters, filtersKey } = buildSubscriptionFilters(
      "PRO",
      "all",
      "monthly",
    );
    expect(filters).toEqual({
      tier: "PRO",
      status: undefined,
      billingCycle: "monthly",
    });
    expect(filtersKey).toBe(JSON.stringify(filters));
  });

  it("clears every filter when all are 'all'", () => {
    const { filters } = buildSubscriptionFilters("all", "all", "all");
    expect(filters).toEqual({
      tier: undefined,
      status: undefined,
      billingCycle: undefined,
    });
  });
});

describe("deriveSubscriptionPageStatus", () => {
  it("is loading while auth resolves regardless of token", () => {
    const r = deriveSubscriptionPageStatus(
      true,
      null,
      false,
      false,
      false,
      null,
      null,
      null,
    );
    expect(r.pageStatus).toBe("loading");
  });

  it("does not treat query loading as loading without a token", () => {
    const r = deriveSubscriptionPageStatus(
      false,
      null,
      true,
      true,
      true,
      null,
      null,
      null,
    );
    expect(r.loading).toBe(false);
    expect(r.pageStatus).toBe("success");
  });

  it("is loading when a token is present and a query is in flight", () => {
    const r = deriveSubscriptionPageStatus(
      false,
      "tok",
      true,
      false,
      false,
      null,
      null,
      null,
    );
    expect(r.pageStatus).toBe("loading");
  });

  it("surfaces the first query error as a user-facing message", () => {
    const r = deriveSubscriptionPageStatus(
      false,
      "tok",
      false,
      false,
      false,
      new Error("metrics down"),
      null,
      null,
    );
    expect(r.pageStatus).toBe("error");
    expect(r.errorMessage).toBeTruthy();
  });

  it("is success once loaded with no errors", () => {
    const r = deriveSubscriptionPageStatus(
      false,
      "tok",
      false,
      false,
      false,
      null,
      null,
      null,
    );
    expect(r.pageStatus).toBe("success");
    expect(r.errorMessage).toBeUndefined();
  });
});
