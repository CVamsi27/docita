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

  it("reads csrf token from cookie", () => {
    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    document.cookie = "XSRF-TOKEN=test-csrf-token; path=/";

    expect(session.getCsrfToken()).toBe("test-csrf-token");
  });

  it("resyncs the in-memory token from localStorage on read", () => {
    const session = createBrowserSessionManager({
      apiUrl: "http://localhost:3001/api/v1",
      tokenStorageKey: "docita_token",
      userStorageKey: "docita_user",
    });

    session.setToken("stale-token");
    localStorage.setItem("docita_token", "fresh-token");

    expect(session.getToken()).toBe("fresh-token");
  });

  it("refreshes token once for concurrent calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "next-token" }),
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(session.getToken()).toBe("next-token");
  });
});
