import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const client = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    validate: vi.fn(),
  };

  return {
    client,
    getAPIClient: vi.fn(),
    showUserFacingErrorToast: vi.fn(),
    appSession: {
      getToken: vi.fn(),
      getCsrfToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      clearSession: vi.fn(),
      redirectToLogin: vi.fn(),
    },
    clientConfig: null as null | {
      onError?: (error: {
        status?: number;
        data?: unknown;
        message?: string;
      }) => Promise<void>;
    },
  };
});

vi.mock("@workspace/data-access", () => ({
  getAPIClient: (config: typeof mocks.clientConfig) => {
    mocks.clientConfig = config;
    return mocks.client;
  },
}));

vi.mock("@/lib/session", () => ({
  appSession: mocks.appSession,
}));

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: mocks.showUserFacingErrorToast,
}));

vi.mock("@/lib/api-config", () => ({
  API_URL: "https://api.docita.work/api/v1",
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
    mocks.clientConfig = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects EMAIL_NOT_VERIFIED without showing a permission toast", async () => {
    const assignSpy = vi.fn();
    vi.stubGlobal("window", {
      location: {
        assign: assignSpy,
      },
    } as never);

    await import("./api-client");

    await mocks.clientConfig?.onError?.({
      status: 403,
      data: { code: "EMAIL_NOT_VERIFIED" },
      message:
        "Please verify your email address before continuing. Check your inbox or request a new verification link at POST /auth/resend-verification.",
    });

    expect(assignSpy).toHaveBeenCalledWith("/verify-email-sent");
    expect(mocks.showUserFacingErrorToast).not.toHaveBeenCalled();
  });
});
