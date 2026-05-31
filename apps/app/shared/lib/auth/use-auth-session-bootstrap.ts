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

async function refreshAccessTokenWithTimeout(
  refreshAccessToken: () => Promise<boolean>,
): Promise<boolean> {
  return Promise.race([
    refreshAccessToken(),
    new Promise<boolean>((resolve) => {
      window.setTimeout(() => resolve(false), SESSION_REFRESH_TIMEOUT_MS);
    }),
  ]);
}

function makeTimeoutRace(
  validateAuth: ValidateAuth,
  timeoutMs: number,
): Promise<unknown> {
  return Promise.race([
    validateAuth(undefined),
    new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Auth validation timed out")),
        timeoutMs,
      );
    }),
  ]);
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
      // Use a shorter probe timeout on the first attempt so we detect a cold-start
      // quickly. If this races out and the user has a valid token we show the
      // "warming up" screen and retry once with the full timeout.
      const timeoutMs = isColdStartRetry
        ? VALIDATE_SESSION_TIMEOUT_MS
        : COLD_START_PROBE_TIMEOUT_MS;

      try {
        const applied = await applyValidatedUser(
          await makeTimeoutRace(validateAuth, timeoutMs),
        );
        if (applied) return;
        // applied = false means the response was well-formed but contained no
        // parseable user (e.g. the API returned an HTML error page during a
        // cold-start). Treat it as a transient API failure so the cold-start
        // retry path below can fire, rather than falling straight through to
        // setIsLoading(false) with user = null and redirecting to login.
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
          // Network error or timeout — could be an API cold-start.
          // If the user has a valid token, signal the warming state and retry once.
          if (!isColdStartRetry && appSession.getToken()) {
            setIsApiStarting(true);
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, COLD_START_RETRY_DELAY_MS);
            });
            // Retry is fire-and-forget within this call — the finally below
            // will still clear isLoading/isApiStarting after it resolves.
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
          const applied = await applyValidatedUser(await validateAuth(undefined));
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
      if (isPublicAuthPath(pathname)) {
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
