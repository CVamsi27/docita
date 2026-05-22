import { describe, expect, it } from "vitest";
import {
  SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_SETTINGS_PATH,
  subscriptionSettingsHref,
} from "./subscription-settings-path";

describe("subscriptionSettingsHref", () => {
  it("defaults to the canonical subscription tab path", () => {
    expect(subscriptionSettingsHref()).toBe(SUBSCRIPTION_SETTINGS_PATH);
    expect(SUBSCRIPTION_SETTINGS_PATH).toBe("/settings?tab=subscription");
  });

  it("merges extra query pairs after tab", () => {
    expect(subscriptionSettingsHref({ tier: "PROFESSIONAL" })).toBe(
      "/settings?tab=subscription&tier=PROFESSIONAL",
    );
  });

  it("exposes a resolve-payment deep link for billing recovery", () => {
    expect(SUBSCRIPTION_BILLING_RESOLVE_PATH).toBe(
      "/settings?tab=subscription&resolvePayment=1",
    );
  });
});
