import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithSession, fetchWithSession } from "@/lib/fetch-with-session";
import { appSession } from "@/lib/session";

vi.mock("@/lib/session", () => ({
  appSession: {
    getToken: vi.fn(),
    getCsrfToken: vi.fn(),
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

  it("attaches bearer token and credentials", async () => {
    vi.mocked(appSession.getToken).mockReturnValue("token-1");
    vi.mocked(appSession.getCsrfToken).mockReturnValue("csrf-1");
    vi.mocked(appSession.refreshAccessToken).mockResolvedValue(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200 }));

    await fetchWithSession("/invoices");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain("/invoices");
    expect(init?.credentials).toBe("include");
    expect((init?.headers as Headers).get("Authorization")).toBe(
      "Bearer token-1",
    );
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
    vi.mocked(appSession.getToken)
      .mockReturnValueOnce("expired-token")
      .mockReturnValueOnce("fresh-token");
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
    expect((secondInit?.headers as Headers).get("Authorization")).toBe(
      "Bearer fresh-token",
    );
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

    const payload = await fetchJsonWithSession<{ id: string }>("/test");
    expect(payload.id).toBe("abc");
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
      "Something went wrong. Please try again.",
    );
  });
});
