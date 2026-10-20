import { useEffect, useRef, type MutableRefObject } from "react";
import { useLocation } from "react-router";
import {
  createOutageRecoveryState,
  recoverFromApiOutage,
  type OutageRecoveryState,
} from "@workspace/data-access";
import { getApiAvailabilityStore } from "@/lib/api/api-availability";
import {
  clearLegacyUserStorage,
  isAuthFailure,
  isPublicAuthPath,
  parseValidatedUser,
  type User,
} from "./auth-context-helpers";
import { consumeE2EAccessToken } from "./e2e-session-token";
import { readLoginLockoutUntil } from "./auth-lockout";
import { appSession } from "./session";

type ValidateAuth = (headers?: Record<string, string>) => Promise<unknown>;

const SESSION_REFRESH_TIMEOUT_MS = 15_000;
const VALIDATE_SESSION_TIMEOUT_MS = 30_000;
const COLD_START_PROBE_TIMEOUT_MS = 10_000;

async function raceWithTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  onTimeout: (settle: {
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
  }) => void,
): Promise<T> {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve, reject) => {
        timeoutId = window.setTimeout(
          () => onTimeout({ resolve, reject }),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function refreshAccessTokenWithTimeout(
  refreshAccessToken: () => Promise<boolean>,
): Promise<boolean> {
  return raceWithTimeout(refreshAccessToken(), SESSION_REFRESH_TIMEOUT_MS, ({ resolve }) =>
    resolve(false),
  );
}

async function makeTimeoutRace(
  validateAuth: ValidateAuth,
  timeoutMs: number,
): Promise<unknown> {
  return raceWithTimeout<unknown>(validateAuth(undefined), timeoutMs, ({ reject }) =>
    reject(new Error("Auth validation timed out")),
  );
}

export function useAuthSessionBootstrap(options: {
  validateAuth: ValidateAuth;
  refreshAccessToken: () => Promise<boolean>;
  clearSession: () => void;
  setUser: (user: User | null) => void;
  setUserRole: (role: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsApiStarting: (starting: boolean) => void;
  setLoginLockoutUntil: (until: number | null) => void;
  hasSetRoleRef: MutableRefObject<boolean>;
}): void {
  const location = useLocation();
  const pathname = location.pathname;
  const hasInitializedSessionRef = useRef(false);
  const {
    validateAuth,
    refreshAccessToken,
    clearSession,
    setUser,
    setUserRole,
    setIsLoading,
    setIsApiStarting,
    setLoginLockoutUntil,
    hasSetRoleRef,
  } = options;

  useEffect(() => {
    if (hasInitializedSessionRef.current) {
      return;
    }
    hasInitializedSessionRef.current = true;

    const e2eAccessToken = consumeE2EAccessToken();
    if (e2eAccessToken) {
      appSession.setToken(e2eAccessToken);
    }

    const persistedLockoutUntil = readLoginLockoutUntil();
    clearLegacyUserStorage();
    if (persistedLockoutUntil) {
      setLoginLockoutUntil(persistedLockoutUntil);
    }

    const settleSession = (): void => {
      setIsLoading(false);
      setIsApiStarting(false);
    };

    const applyValidatedUser = async (raw: unknown): Promise<boolean> => {
      const userData = parseValidatedUser(raw);
      if (!userData) return false;
      setUser(userData);
      setUserRole(userData.role);
      hasSetRoleRef.current = true;
      await refreshAccessTokenWithTimeout(refreshAccessToken);
      return true;
    };

    const handleAuthFailure = async (): Promise<void> => {
      if (isPublicAuthPath(pathname)) {
        clearSession();
        return;
      }

      const refreshed = await refreshAccessTokenWithTimeout(refreshAccessToken);
      if (!refreshed) {
        clearSession();
        appSession.redirectToLogin();
        return;
      }

      try {
        const applied = await applyValidatedUser(
          await validateAuth(undefined),
        );
        if (!applied) clearSession();
      } catch (retryError) {
        if (isAuthFailure(retryError)) {
          clearSession();
        }
      }
    };

    /**
     * Park the workspace on the warming screen until the API answers again.
     * Returns false when the bootstrap should settle instead of retrying —
     * the availability store keeps probing and the outage gate keeps the
     * warming screen up, so the session is not dropped. (Shared bounded
     * recovery logic: `recoverFromApiOutage` in @workspace/data-access.)
     */
    const waitForApiRecovery = async (
      recovery: OutageRecoveryState,
    ): Promise<boolean> => {
      setIsLoading(false);
      setIsApiStarting(true);
      return recoverFromApiOutage(getApiAvailabilityStore, recovery);
    };

    const recoverThenRetry = async (recovery: OutageRecoveryState): Promise<void> => {
      const shouldRetry = await waitForApiRecovery(recovery);
      if (!shouldRetry) {
        settleSession();
        return;
      }
      setIsLoading(true);
      setIsApiStarting(false);
      await validateSession(true, recovery);
    };

    const validateSession = async (
      isRecoveryRetry = false,
      recovery: OutageRecoveryState = createOutageRecoveryState(),
    ): Promise<void> => {
      const timeoutMs = isRecoveryRetry
        ? VALIDATE_SESSION_TIMEOUT_MS
        : COLD_START_PROBE_TIMEOUT_MS;

      let applied = false;
      try {
        applied = await applyValidatedUser(
          await makeTimeoutRace(validateAuth, timeoutMs),
        );
      } catch (error) {
        if (isAuthFailure(error)) {
          await handleAuthFailure();
          settleSession();
          return;
        }

        // Outage, not an auth failure. This is also the reload path: the access
        // token lives in memory only, so a fresh load has no token even with a
        // valid refresh cookie. Wait for the API and retry either way — if the
        // session really is gone, the retry answers 401 and lands on login.
        await recoverThenRetry(recovery);
        return;
      }

      if (applied) {
        settleSession();
        return;
      }

      // The request answered with an unusable payload (cold-start HTML or a
      // partially booted API). With a token that is transient, not signed out.
      if (appSession.getToken()) {
        await recoverThenRetry(recovery);
        return;
      }

      settleSession();
    };

    if (!appSession.getToken()) {
      if (
        isPublicAuthPath(pathname) ||
        (pathname !== null && appSession.isPublicPath(pathname))
      ) {
        setIsLoading(false);
        return;
      }
      void (async () => {
        await refreshAccessTokenWithTimeout(refreshAccessToken);
        await validateSession();
      })();
      return;
    }

    void validateSession();
  }, [
    clearSession,
    pathname,
    refreshAccessToken,
    setIsLoading,
    setIsApiStarting,
    setLoginLockoutUntil,
    setUser,
    setUserRole,
    validateAuth,
    hasSetRoleRef,
  ]);
}
