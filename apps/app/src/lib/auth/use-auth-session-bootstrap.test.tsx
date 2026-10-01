import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthSessionBootstrap } from "./use-auth-session-bootstrap";
import { appSession } from "./session";

const availability = vi.hoisted(() => ({
  store: {
    getSnapshot: vi.fn<() => {
      status: "available" | "unavailable";
      reason: null | "api" | "database";
      attempt: number;
      isProbing: boolean;
    }>(),
    subscribe: vi.fn(() => () => {}),
    trackResponse: vi.fn(),
    reportUnavailable: vi.fn(),
    reportAvailable: vi.fn(),
    confirmUnavailability: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    waitForAvailable: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    retryNow: vi.fn(),
  },
}));

const router = vi.hoisted(() => ({ pathname: "/today" }));

vi.mock("@/lib/api/api-availability", () => ({
  getApiAvailabilityStore: availability.store,
}));

vi.mock("react-router", () => ({
  useLocation: () => ({ pathname: router.pathname }),
}));

const VALIDATED_USER = {
  id: "user-1",
  email: "doctor@example.com",
  name: "Dr Rao",
  role: "DOCTOR",
  clinicId: "clinic-1",
  emailVerified: true,
  onboardingStep: "COMPLETED",
};

function createHarness(validateAuth: ReturnType<typeof vi.fn>) {
  const spies = {
    setUser: vi.fn(),
    setUserRole: vi.fn(),
    setIsLoading: vi.fn(),
    setIsApiStarting: vi.fn(),
    setLoginLockoutUntil: vi.fn(),
    clearSession: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue(true),
  };

  function Harness() {
    useAuthSessionBootstrap({
      validateAuth,
      refreshAccessToken: spies.refreshAccessToken,
      clearSession: spies.clearSession,
      setUser: spies.setUser,
      setUserRole: spies.setUserRole,
      setIsLoading: spies.setIsLoading,
      setIsApiStarting: spies.setIsApiStarting,
      setLoginLockoutUntil: spies.setLoginLockoutUntil,
      hasSetRoleRef: { current: false },
    });
    return null;
  }

  return { spies, Harness };
}

afterEach(() => {
  appSession.clearSession();
  vi.clearAllMocks();
  availability.store.confirmUnavailability.mockResolvedValue(undefined);
  availability.store.waitForAvailable.mockResolvedValue(undefined);
});

describe("useAuthSessionBootstrap outage handling", () => {
  it("waits for API recovery and retries validation instead of dropping the session", async () => {
    appSession.setToken("token-1");
    availability.store.getSnapshot.mockReturnValue({
      status: "unavailable",
      reason: "api",
      attempt: 1,
      isProbing: false,
    });

    const validateAuth = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ valid: true, user: VALIDATED_USER });
    const { spies, Harness } = createHarness(validateAuth);

    render(<Harness />);

    await waitFor(() => {
      expect(spies.setUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1", clinicId: "clinic-1" }),
      );
    });

    expect(validateAuth).toHaveBeenCalledTimes(2);
    expect(availability.store.reportUnavailable).toHaveBeenCalled();
    expect(availability.store.waitForAvailable).toHaveBeenCalled();
    expect(spies.setIsApiStarting).toHaveBeenCalledWith(true);
    expect(spies.clearSession).not.toHaveBeenCalled();
    expect(spies.setIsLoading).toHaveBeenLastCalledWith(false);
  });

  it("waits for recovery on the reload path, where no in-memory token exists yet", async () => {
    // Every page reload starts without an access token (it lives in memory
    // only), so the outage wait must run here too — otherwise the workspace
    // bounces to login instead of restoring the cookie session.
    appSession.clearSession();
    availability.store.getSnapshot.mockReturnValue({
      status: "unavailable",
      reason: "api",
      attempt: 1,
      isProbing: false,
    });

    const validateAuth = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({ valid: true, user: VALIDATED_USER });
    const { spies, Harness } = createHarness(validateAuth);

    render(<Harness />);

    await waitFor(() => {
      expect(spies.setUser).toHaveBeenCalled();
    });

    expect(availability.store.reportUnavailable).toHaveBeenCalled();
    expect(availability.store.waitForAvailable).toHaveBeenCalled();
    expect(spies.setIsApiStarting).toHaveBeenCalledWith(true);
    expect(validateAuth).toHaveBeenCalledTimes(2);
  });

  it("settles the transient-retry path when validation keeps failing while the API answers", async () => {
    appSession.setToken("token-1");
    availability.store.getSnapshot.mockReturnValue({
      status: "available",
      reason: null,
      attempt: 0,
      isProbing: false,
    });

    const validateAuth = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { spies, Harness } = createHarness(validateAuth);

    render(<Harness />);

    await waitFor(() => {
      expect(spies.setIsLoading).toHaveBeenLastCalledWith(false);
    });

    // Bounded retries: first attempt + MAX_TRANSIENT_RETRIES, then settle.
    expect(validateAuth).toHaveBeenCalledTimes(3);
    expect(availability.store.waitForAvailable).not.toHaveBeenCalled();
    expect(spies.clearSession).not.toHaveBeenCalled();
  });
});
