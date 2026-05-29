import { describe, expect, it } from "vitest";
import { formatPlanBillingDetail } from "./billing-subscription-helpers";

describe("formatPlanBillingDetail", () => {
  it("formats INR annual amounts with Indian grouping", () => {
    expect(
      formatPlanBillingDetail(
        {
          billingCycle: "YEARLY",
          basePriceCents: 24_000_000,
          currency: "INR",
        },
        "ACTIVE",
      ),
    ).toBe("Annual — ₹2,40,000/yr");
  });

  it("formats USD amounts with US grouping and decimals", () => {
    expect(
      formatPlanBillingDetail(
        {
          billingCycle: "MONTHLY",
          basePriceCents: 199_999,
          currency: "USD",
        },
        "ACTIVE",
      ),
    ).toBe("Monthly — $1,999.99/mo");
  });
});
