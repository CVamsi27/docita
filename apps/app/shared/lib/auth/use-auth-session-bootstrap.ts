"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { usePathname } from "next/navigation";
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
/**
 * First-attempt timeout before declaring a possible cold-start. Kept below
 * the full 30 s so the "warming up" screen appears promptly when the API
 * machine is still booting, but high enough to avoid false positives on
 * genuinely slow-but-working connections.
 */
const COLD_START_PROBE_TIMEOUT_MS = 10_000;
/** How long to wait before retrying after a suspected cold-start. */
const COLD_START_RETRY_DELAY_MS = 5_000;

// Shared by `refreshAccessTokenWithTimeout` and `makeTimeoutRace` — both race
// a promise against a `window.setTimeout`-backed fallback and must clear that
// timer in a `finally` regardless of which side wins. Only the fallback's
// settlement differs (resolve with a default vs. reject with an error), so
// that's the one piece left to the caller; the race-and-cleanup shape lives
// here instead of drifting between the two timeout flavors.
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
  const pathname = usePathname();
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

    const applyValidatedUser = async (raw: unknown): Promise<boolean> => {
      const userData = parseValidatedUser(raw);
      if (!userData) return false;
      setUser(userData);
      setUserRole(userData.role);
      hasSetRoleRef.current = true;
      // Always refresh the in-memory token so non-cookie channels (e.g. WebSocket
      // Bearer auth) get a fresh JWT, regardless of whether the E2E init script
      // already injected a token into sessionStorage. That injected token is the
      // access JWT from the login call and may be stale by the time a later page
      // navigation runs.
      await refreshAccessTokenWithTimeout(refreshAccessToken);
      return true;
    };

    const validateSession = async (isColdStartRetry = false): Promise<void> => {
      const timeoutMs = isColdStartRetry
        ? VALIDATE_SESSION_TIMEOUT_MS
        : COLD_START_PROBE_TIMEOUT_MS;

      try {
        const applied = await applyValidatedUser(
          await makeTimeoutRace(validateAuth, timeoutMs),
        );
        if (applied) return;
        if (!isColdStartRetry && appSession.getToken()) {
          setIsApiStarting(true);
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, COLD_START_RETRY_DELAY_MS);
          });
          await validateSession(true);
        }
        return;
      } catch (error) {
        if (!isAuthFailure(error)) {
          if (!isColdStartRetry && appSession.getToken()) {
            setIsApiStarting(true);
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, COLD_START_RETRY_DELAY_MS);
            });
            await validateSession(true);
          }
          // Either no token (unauthenticated) or second attempt still failed —
          // fall through to setIsLoading(false) in finally.
          return;
        }

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
      } finally {
        setIsLoading(false);
        setIsApiStarting(false);
      }
    };

    if (!appSession.getToken()) {
      // Auth-shell pages (/login, /register, …) AND per-session-secret QR
      // landing pages (/upload-signature, /mobile-upload, /book) are reachable
      // without a clinician session. Skip the validate/redirect dance entirely
      // so a phone scanning the QR never bounces to /login.
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
