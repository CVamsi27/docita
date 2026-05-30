import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth-context";

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  pathname: "/login",
  setUserRole: vi.fn(),
  apiFetch: vi.fn(),
  session: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    clearSession: vi.fn(),
    getCsrfToken: vi.fn(),
    refreshAccessToken: vi.fn(),
    redirectToLogin: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  usePathname: () => mocks.pathname,
}));

vi.mock("@/lib/api/api-client", () => ({
  apiFetch: mocks.apiFetch,
}));

vi.mock("@/lib/auth/session", () => ({
  appSession: mocks.session,
}));

vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => ({
    setUserRole: mocks.setUserRole,
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks.pathname = "/login";
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    mocks.setUserRole.mockReset();
    mocks.apiFetch.mockReset();
    mocks.session.getToken.mockReset();
    mocks.session.setToken.mockReset();
    mocks.session.clearSession.mockReset();
    mocks.session.getCsrfToken.mockReset();
    mocks.session.refreshAccessToken.mockReset();
    mocks.session.redirectToLogin.mockReset();

    mocks.session.getToken.mockReturnValue("stale-token");
    mocks.session.getCsrfToken.mockReturnValue(null);
    mocks.session.clearSession.mockImplementation(() => {
      localStorage.removeItem("docita_user");
    });
  });

  it("clears an invalid cached session on public auth routes without refreshing", async () => {
    mocks.apiFetch.mockRejectedValue({ status: 403 });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mocks.session.setToken).toHaveBeenCalledWith(null);
    expect(mocks.session.clearSession).toHaveBeenCalledTimes(1);
    expect(mocks.session.refreshAccessToken).not.toHaveBeenCalled();
    expect(mocks.setUserRole).toHaveBeenLastCalledWith("");
    expect(localStorage.getItem("docita_user")).toBeNull();
  });

  it("still refreshes invalid cached sessions on protected routes", async () => {
    mocks.pathname = "/dashboard";
    mocks.apiFetch.mockRejectedValue({ status: 401 });
    mocks.session.refreshAccessToken.mockResolvedValue(false);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mocks.session.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mocks.session.clearSession).toHaveBeenCalledTimes(1);
    expect(mocks.session.redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("hydrates the latest onboarding step from validate", async () => {
    mocks.apiFetch.mockResolvedValue({
      valid: true,
      user: {
        id: "user-1",
        email: "owner@example.com",
        name: "Owner One",
        role: "ADMIN",
        clinicId: null,
        onboardingStep: "CREATING_CLINIC",
      },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user?.onboardingStep).toBe("CREATING_CLINIC");
    expect(mocks.setUserRole).toHaveBeenCalledWith("ADMIN");
    expect(localStorage.getItem("docita_user")).toBeNull();
  });

  it("routes unverified users to verify-email-sent immediately after login", async () => {
    mocks.session.getToken.mockReturnValue(null);
    mocks.apiFetch.mockResolvedValueOnce({
      access_token: "fresh-token",
      user: {
        id: "user-1",
        email: "owner@example.com",
        name: "Owner One",
        role: "ADMIN",
        clinicId: null,
        emailVerified: false,
        onboardingStep: "CHOOSE_PATH",
      },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login("owner@example.com", "Password@123");
    });

    expect(mocks.router.push).toHaveBeenCalledWith("/verify-email-sent");
    expect(sessionStorage.getItem("docita_verification_email_status")).toBe(
      "pending",
    );
  });

  it("stores a failed verification-delivery status after registration", async () => {
    mocks.session.getToken.mockReturnValue(null);
    mocks.apiFetch.mockResolvedValueOnce({
      access_token: "fresh-token",
      verificationEmailSent: false,
      user: {
        id: "user-1",
        email: "owner@example.com",
        name: "Owner One",
        role: "ADMIN",
        clinicId: null,
        emailVerified: false,
        onboardingStep: "CHOOSE_PATH",
      },
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.register(
        "owner@example.com",
        "Password@123",
        "Owner",
        "One",
        "ADMIN",
      );
    });

    expect(mocks.router.push).toHaveBeenCalledWith("/verify-email-sent");
    expect(sessionStorage.getItem("docita_verification_email_status")).toBe(
      "failed",
    );
  });
});
