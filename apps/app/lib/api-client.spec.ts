import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    showUserFacingErrorToast: vi.fn(),
    appSession: {
      getToken: vi.fn(),
      getCsrfToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      clearSession: vi.fn(),
      redirectToLogin: vi.fn(),
    },
  };
});

vi.mock("@/lib/session", () => ({
  appSession: mocks.appSession,
}));

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: mocks.showUserFacingErrorToast,
}));

describe("api-client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    mocks.showUserFacingErrorToast.mockReset();
    mocks.appSession.getToken.mockReset();
    mocks.appSession.getCsrfToken.mockReset();
    mocks.appSession.refreshAccessToken.mockReset();
    mocks.appSession.clearSession.mockReset();
    mocks.appSession.redirectToLogin.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects EMAIL_NOT_VERIFIED without showing a permission toast", async () => {
    const assignSpy = vi.fn();
    const redirectWindow = Object.create(window) as Window;
    Object.defineProperty(redirectWindow, "location", {
      configurable: true,
      value: {
        assign: assignSpy,
      },
    });
    vi.stubGlobal("window", redirectWindow);
    const { handleApiClientError } = await import("./api-client-error-handler");

    await handleApiClientError({
      status: 403,
      data: { code: "EMAIL_NOT_VERIFIED" },
      message:
        "Please verify your email address before continuing. Check your inbox or request a new verification link at POST /auth/resend-verification.",
    });

    expect(assignSpy).toHaveBeenCalledWith("/verify-email-sent");
    expect(mocks.showUserFacingErrorToast).not.toHaveBeenCalled();
  });
});
