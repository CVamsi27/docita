/** @vitest-environment jsdom */

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth, usePermission } from "../src/auth-context.js";
import {
  canPerformActions,
  getPermissionsForRole,
  hasPermission,
} from "../src/permissions-map.js";
import { tokenStorage } from "../src/token-storage.js";

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

  it("normalizes legacy roles to canonical roles", () => {
    expect(hasPermission("CLINIC_ADMIN", "VIEW_STAFF")).toBe(true);
    expect(hasPermission("STAFF", "VIEW_PATIENTS")).toBe(true);
    expect(getPermissionsForRole("PATIENT")).toContain("VIEW_PRESCRIPTIONS");
  });

  it("denies unknown roles and enforces patient restrictions", () => {
    expect(hasPermission("PATIENT", "VIEW_INVOICES")).toBe(true);
    expect(hasPermission("PATIENT", "EDIT_PATIENTS")).toBe(false);
    expect(hasPermission("SOME_UNKNOWN_ROLE", "VIEW_PATIENTS")).toBe(false);
  });

  it("checks multiple permissions", () => {
    expect(
      canPerformActions("ADMIN_DOCTOR", ["VIEW_PATIENTS", "CREATE_INVOICES"]),
    ).toBe(true);

    expect(
      canPerformActions("RECEPTIONIST", ["VIEW_PATIENTS", "DELETE_PATIENTS"]),
    ).toBe(false);

    expect(
      canPerformActions("PATIENT", ["VIEW_PRESCRIPTIONS", "VIEW_INVOICES"]),
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

  it("warns when setToken is used", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    tokenStorage.setToken("abc");

    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("reads csrf token from meta tag", () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "csrf-token");
    meta.setAttribute("content", "csrf-123");
    document.head.appendChild(meta);

    expect(tokenStorage.getCsrfToken()).toBe("csrf-123");
  });

  it("refreshes token via API and throws on non-ok response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false });

    vi.stubGlobal("fetch", fetchMock);

    await expect(tokenStorage.refreshToken()).resolves.toBeUndefined();
    await expect(tokenStorage.refreshToken()).rejects.toThrow(
      "Token refresh failed",
    );
  });
});

describe("auth context", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("retries /auth/me after refresh when request returns 401", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v1/auth/me") {
        const meCalls = fetchMock.mock.calls.filter(
          ([url]) => url === "/api/v1/auth/me",
        ).length;

        if (meCalls === 1) {
          return createMockResponse(401);
        }

        return createMockResponse(200, authenticatedUser);
      }

      if (input === "/api/v1/auth/refresh") {
        return createMockResponse(200, {});
      }

      return createMockResponse(404);
    });

    vi.stubGlobal("fetch", fetchMock);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, { disableIdleTimeout: true }, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.id).toBe("user-1");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/refresh",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("expires session after idle timeout", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v1/auth/me") {
        return createMockResponse(200, authenticatedUser);
      }

      if (input === "/api/v1/auth/logout") {
        return createMockResponse(200, {});
      }

      if (input === "/api/v1/auth/refresh") {
        return createMockResponse(200, {});
      }

      return createMockResponse(404);
    });

    vi.stubGlobal("fetch", fetchMock);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, { idleTimeoutMs: 200 }, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.errorCode).toBe("SESSION_EXPIRED");
    }, { timeout: 2000 });
  });

  it("exposes granular auth error code on login failure", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v1/auth/me") {
        return createMockResponse(401, {});
      }

      if (input === "/api/v1/auth/refresh") {
        return createMockResponse(401, {});
      }

      if (input === "/api/v1/auth/login") {
        return createMockResponse(423, {
          code: "ACCOUNT_LOCKED",
          message: "Account locked due to failed attempts",
        });
      }

      return createMockResponse(404, {});
    });

    vi.stubGlobal("fetch", fetchMock);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, { disableIdleTimeout: true }, children);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await expect(
        result.current.login("doctor@example.com", "bad-password"),
      ).rejects.toThrow("Account locked due to failed attempts");
    });

    expect(result.current.errorCode).toBe("ACCOUNT_LOCKED");
    expect(result.current.error).toContain("locked");
  });

  it("supports permission hook checks via provider", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      if (input === "/api/v1/auth/me") {
        return createMockResponse(200, authenticatedUser);
      }

      if (input === "/api/v1/auth/refresh") {
        return createMockResponse(200, {});
      }

      return createMockResponse(404, {});
    }));

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(AuthProvider, { disableIdleTimeout: true }, children);

    const { result } = renderHook(() => usePermission("VIEW_PATIENTS"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
