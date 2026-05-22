import { describe, expect, it } from "vitest";
import { getRedirectPathForForbiddenCode } from "./api-client-error-handler";
import {
  SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_SETTINGS_PATH,
} from "@/lib/subscription/subscription-settings-path";

describe("getRedirectPathForForbiddenCode", () => {
  it("routes inactive subscriptions to billing resolve", () => {
    expect(getRedirectPathForForbiddenCode("SUBSCRIPTION_INACTIVE")).toBe(
      SUBSCRIPTION_BILLING_RESOLVE_PATH,
    );
  });

  it("routes tier errors to subscription settings without auto-checkout", () => {
    expect(getRedirectPathForForbiddenCode("INSUFFICIENT_TIER")).toBe(
      SUBSCRIPTION_SETTINGS_PATH,
    );
  });

  it("returns null for unknown codes", () => {
    expect(getRedirectPathForForbiddenCode("OTHER")).toBeNull();
  });
});
