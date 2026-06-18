import { describe, expect, it } from "vitest";
import {
  formatBillingCycleLabel,
  formatInternalTierCardPrice,
  formatPlanLimitCount,
  tierPriceIsCustom,
} from "./internal-tier-display.js";

describe("internal-tier-display", () => {
  it("treats enterprise and null price as custom", () => {
    expect(tierPriceIsCustom("ENTERPRISE", 0)).toBe(true);
    expect(tierPriceIsCustom("ESSENTIAL", null)).toBe(true);
    expect(tierPriceIsCustom("ESSENTIAL", 999)).toBe(false);
  });

  it("formats unlimited limits instead of sentinel negatives", () => {
    expect(formatPlanLimitCount(-1)).toBe("Unlimited");
    expect(formatPlanLimitCount(999_999)).toBe("Unlimited");
    expect(formatPlanLimitCount(5)).toBe("5");
  });

  it("formats enterprise card price as Custom, not Free", () => {
    const money = (amount: number) => `₹${amount}`;
    expect(formatInternalTierCardPrice("ENTERPRISE", 0, money)).toBe("Custom");
    expect(formatInternalTierCardPrice("STARTER", 0, money)).toBe("Free");
    expect(formatInternalTierCardPrice("ESSENTIAL", 4999, money)).toBe("₹4999");
  });

  it("formats billing cycle labels for operators", () => {
    expect(formatBillingCycleLabel("custom")).toBe("Custom pricing");
    expect(formatBillingCycleLabel("monthly")).toBe("Monthly");
  });
});
