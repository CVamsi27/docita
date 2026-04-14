import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth, usePermission } from "../src/auth-context";
import {
  canPerformActions,
  getPermissionsForRole,
  hasPermission,
} from "../src/permissions-map";
import { tokenStorage } from "../src/token-storage";

function createMockResponse(status: number, payload?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload ?? {}),
  };
}

const authenticatedUser = {
  id: "user-1",
  email: "doctor@example.com",
  name: "Doctor",
  role: "DOCTOR" as const,
  permissions: ["VIEW_PATIENTS", "VIEW_APPOINTMENTS"],
  isVerified: true,
  createdAt: new Date().toISOString(),
};

describe("permissions map", () => {
  it("grants permissions for canonical roles", () => {
    expect(hasPermission("DOCTOR", "VIEW_PATIENTS")).toBe(true);
    expect(hasPermission("DOCTOR", "MANAGE_SUBSCRIPTIONS")).toBe(false);
  });

  it("lists permissions per role", () => {
    expect(getPermissionsForRole("ADMIN")).toContain("VIEW_STAFF");
    expect(getPermissionsForRole("PATIENT")).toContain("VIEW_PATIENTS");
    expect(getPermissionsForRole("PATIENT")).not.toContain("VIEW_INVOICES");
  });

  it("restricts patient role permissions", () => {
    expect(hasPermission("PATIENT", "EDIT_PATIENTS")).toBe(false);
    expect(hasPermission("PATIENT", "VIEW_PATIENTS")).toBe(true);
  });

  it("checks multiple permissions", () => {
    expect(
      canPerformActions("ADMIN_DOCTOR", ["VIEW_PATIENTS", "CREATE_INVOICES"]),
    ).toBe(true);

    expect(
      canPerformActions("RECEPTIONIST", ["VIEW_PATIENTS", "DELETE_PATIENTS"]),
    ).toBe(false);

    expect(
      canPerformActions("PATIENT", ["VIEW_PATIENTS"]),
    ).toBe(true);
  });
});

describe("token storage", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("never exposes token to JavaScript", () => {
    expect(tokenStorage.getToken()).toBeNull();
  });

  it("reads csrf token from meta tag", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "csrf-token");
    meta.setAttribute("content", "csrf-123");
    document.head.appendChild(meta);

    expect(tokenStorage.getCsrfToken()).toBe("csrf-123");
  });

  it("rejects refresh when the API response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    await expect(tokenStorage.refreshToken()).rejects.toThrow(
      "Please sign in again to continue.",
    );
  });
});

describe("auth context", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads user when /auth/me succeeds", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/api/v1/auth/me")) {
        return createMockResponse(200, authenticatedUser);
      }
      return createMockResponse(404);
    });

    vi.stubGlobal("fetch", fetchMock);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe("user-1");
  });

  it("supports permission hook checks via provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);
        if (url.includes("/api/v1/auth/me")) {
          return createMockResponse(200, authenticatedUser);
        }
        return createMockResponse(404);
      }),
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => usePermission("VIEW_PATIENTS"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("surfaces a user-facing message when login fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : String(input);
        if (url.includes("/api/v1/auth/me")) {
          return createMockResponse(401, {});
        }
        if (url.includes("/api/v1/auth/login")) {
          return createMockResponse(401, {});
        }
        return createMockResponse(404);
      }),
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, null, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await expect(
        result.current.login("doctor@example.com", "bad-password"),
      ).rejects.toThrow(/could not sign you in/i);
    });

    expect(result.current.error).toBeTruthy();
  });
});
