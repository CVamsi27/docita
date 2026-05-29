import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserSessionManager } from "@workspace/data-access";

describe("createBrowserSessionManager", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    vi.restoreAllMocks();
  });

  it("stores and clears token and session values", () => {
    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    session.setToken("token-1");
    localStorage.setItem("docita_user", JSON.stringify({ id: "u1" }));

    expect(session.getToken()).toBe("token-1");

    session.clearSession();
    expect(session.getToken()).toBeNull();
    expect(localStorage.getItem("docita_user")).toBeNull();
  });

  it("reads csrf token from cookie when httpOnly is not used", () => {
    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    document.cookie = "XSRF-TOKEN=test-csrf-token; path=/";

    expect(session.getCsrfToken()).toBe("test-csrf-token");
  });

  it("prefers in-memory csrf from response header over cookie", () => {
    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    session.setCsrfToken("header-token");
    document.cookie = "XSRF-TOKEN=cookie-token; path=/";

    expect(session.getCsrfToken()).toBe("header-token");
  });

  it("captures csrf token from X-CSRF-Token response header", () => {
    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    session.captureCsrfFromResponse(
      new Response(null, { headers: { "X-CSRF-Token": "from-header" } }),
    );

    expect(session.getCsrfToken()).toBe("from-header");
  });

  it("does NOT persist access tokens to localStorage (XSS hardening)", () => {
    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    session.setToken("in-memory-token");

    expect(localStorage.getItem("docita_token")).toBeNull();
    expect(session.getToken()).toBe("in-memory-token");
  });

  it("evicts legacy stored tokens on construction", () => {
    localStorage.setItem("docita_token", "legacy-from-old-client");

    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    expect(localStorage.getItem("docita_token")).toBeNull();
    // The legacy persisted token must NOT seed the in-memory token —
    // the only way to obtain one is a real refresh-cookie round trip.
    expect(session.getToken()).toBeNull();
  });

  it("refreshes token once for concurrent calls", async () => {
    // First call (or two) is the CSRF bootstrap GET against /health,
    // followed by the single POST to /auth/refresh. The de-duplication
    // contract is on the refresh POST, not on the bootstrap probe.
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/auth/refresh")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: async () => ({ access_token: "next-token" }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: new Headers({ "X-CSRF-Token": "csrf-from-bootstrap" }),
        json: async () => ({ status: "ok" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    const [first, second] = await Promise.all([
      session.refreshAccessToken(),
      session.refreshAccessToken(),
    ]);

    expect(first).toBe(true);
    expect(second).toBe(true);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("/auth/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
    expect(session.getToken()).toBe("next-token");
  });

  it("skips refresh on public auth routes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState({}, "", "/login");

    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
      publicPaths: ["/login", "/register", "/forgot-password", "/reset-password"],
    });

    const refreshed = await session.refreshAccessToken();

    expect(refreshed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
