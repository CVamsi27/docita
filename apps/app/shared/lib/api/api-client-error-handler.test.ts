import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getRedirectPathForForbiddenCode,
  handleApiClientError,
} from "./api-client-error-handler";
import {
  SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_SETTINGS_PATH,
} from "@/lib/subscription/subscription-settings-path";

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

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

  it("routes missing clinic to choose-path", () => {
    expect(getRedirectPathForForbiddenCode("NO_CLINIC")).toBe("/choose-path");
  });

  it("routes billing hard lock to billing resolve", () => {
    expect(getRedirectPathForForbiddenCode("SUBSCRIPTION_HARD_LOCKED")).toBe(
      SUBSCRIPTION_BILLING_RESOLVE_PATH,
    );
  });

  it("returns null for unknown codes", () => {
    expect(getRedirectPathForForbiddenCode("OTHER")).toBeNull();
  });
});

describe("handleApiClientError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns immediately for 401 without toasts or redirects", async () => {
    const { showUserFacingErrorToast } = await import(
      "@/lib/errors/user-facing-errors"
    );
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    await handleApiClientError({ status: 401, message: "Unauthorized" });

    expect(showUserFacingErrorToast).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it("returns immediately for network and timeout errors", async () => {
    const { showUserFacingErrorToast } = await import(
      "@/lib/errors/user-facing-errors"
    );

    await handleApiClientError({ isNetworkError: true, message: "offline" });
    await handleApiClientError({ code: "NETWORK_ERROR", message: "offline" });
    await handleApiClientError({ code: "TIMEOUT", message: "slow" });

    expect(showUserFacingErrorToast).not.toHaveBeenCalled();
  });

  it("does not bounce to /login for CSRF errors mid-onboarding (no logout loop)", async () => {
    const { showUserFacingErrorToast } = await import(
      "@/lib/errors/user-facing-errors"
    );
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { assign, pathname: "/onboarding" },
    });

    await handleApiClientError({
      status: 403,
      code: "INVALID_CSRF_TOKEN",
      message: "Invalid CSRF token",
    });

    expect(assign).not.toHaveBeenCalled();
    expect(showUserFacingErrorToast).not.toHaveBeenCalled();
  });

  it("still redirects CSRF errors to /login on post-setup routes", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign, pathname: "/today" } });

    await handleApiClientError({
      status: 403,
      code: "INVALID_CSRF_TOKEN",
      message: "Invalid CSRF token",
    });

    expect(assign).toHaveBeenCalledWith("/login");
  });
});
