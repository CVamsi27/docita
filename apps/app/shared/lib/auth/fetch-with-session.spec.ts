import { beforeEach, describe, expect, it, vi } from "vitest";
import { isRecord } from "@workspace/utils";
import { fetchJsonWithSession, fetchWithSession } from "@/lib/auth/fetch-with-session";
import { appSession } from "@/lib/auth/session";

vi.mock("@/lib/auth/session", () => ({
  appSession: {
    getToken: vi.fn(),
    getCsrfToken: vi.fn(),
    captureCsrfFromResponse: vi.fn(),
    refreshAccessToken: vi.fn(),
    clearSession: vi.fn(),
    redirectToLogin: vi.fn(),
  },
}));

describe("fetchWithSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("rides cookies, not Authorization headers (XSS hardening)", async () => {
    vi.mocked(appSession.getToken).mockReturnValue("token-1");
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-1");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));

    await fetchWithSession("/invoices");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/invoices");
    // credentials: include is what brings the httpOnly access_token cookie.
    expect(init?.credentials).toBe("include");
    // Authorization must NOT be set — the cookie is the credential.
    expect((init?.headers as Headers).get("Authorization")).toBeNull();
  });

  it("attaches CSRF header for mutating requests", async () => {
    vi.mocked(appSession.getToken).mockReturnValue("token-1");
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-1");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));

    await fetchWithSession("/imports/preview", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Headers).get("x-xsrf-token")).toBe("csrf-1");
  });

  it("preserves an explicit CSRF header for mutating requests", async () => {
    vi.mocked(appSession.getToken).mockReturnValue("token-1");
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-from-cookie");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));

    await fetchWithSession("/imports/preview", {
      method: "POST",
      headers: {
        "x-xsrf-token": "csrf-explicit",
      },
      body: JSON.stringify({}),
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Headers).get("x-xsrf-token")).toBe(
      "csrf-explicit",
    );
  });

  it("retries once when refresh succeeds after 401", async () => {
    vi.mocked(appSession.getToken).mockReturnValue(null);
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-1");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(true);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ status: 401 })
        .mockResolvedValueOnce({ status: 200 }),
    );

    await fetchWithSession("/prescriptions/1/pdf");

    expect(fetch).toHaveBeenCalledTimes(2);
    const [, secondInit] = vi.mocked(fetch).mock.calls[1];
    // The retry rides the refreshed access_token cookie set by the
    // refresh endpoint — no Authorization header should be attached.
    expect((secondInit?.headers as Headers).get("Authorization")).toBeNull();
    expect(secondInit?.credentials).toBe("include");
    expect(appSession.clearSession).not.toHaveBeenCalled();
    expect(appSession.redirectToLogin).not.toHaveBeenCalled();
  });

  it("clears session and redirects when still unauthorized", async () => {
    vi.mocked(appSession.getToken).mockReturnValue("expired-token");
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-1");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401 }));

    await fetchWithSession("/invoices");

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(appSession.clearSession).toHaveBeenCalledTimes(1);
    expect(appSession.redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("returns parsed JSON for successful responses", async () => {
    vi.mocked(appSession.getToken).mockReturnValue("token-1");
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-1");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({ id: "abc" }),
      }),
    );

    const payload = await fetchJsonWithSession("/test");
    expect(isRecord(payload) && payload.id).toBe("abc");
  });

  it("throws safe copy when JSON error payload is provided", async () => {
    vi.mocked(appSession.getToken).mockReturnValue("token-1");
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-1");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(false);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 400,
        ok: false,
        json: async () => ({ message: "Invalid payload" }),
      }),
    );

    await expect(fetchJsonWithSession("/test")).rejects.toThrow(
      "We could not load the requested details. Please try again.",
    );
  });
});
