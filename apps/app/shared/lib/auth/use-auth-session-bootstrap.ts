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
import { readLoginLockoutUntil } from "./auth-lockout";
import { appSession } from "./session";

type ValidateAuth = (headers?: Record<string, string>) => Promise<unknown>;

export function useAuthSessionBootstrap(options: {
  validateAuth: ValidateAuth;
  refreshAccessToken: () => Promise<boolean>;
  clearSession: () => void;
  setUser: (user: User | null) => void;
  setUserRole: (role: string) => void;
  setIsLoading: (loading: boolean) => void;
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
    setLoginLockoutUntil,
    hasSetRoleRef,
  } = options;

  useEffect(() => {
    if (hasInitializedSessionRef.current) {
      return;
    }
    hasInitializedSessionRef.current = true;

    const persistedLockoutUntil = readLoginLockoutUntil();
    clearLegacyUserStorage();
    if (persistedLockoutUntil) {
      setLoginLockoutUntil(persistedLockoutUntil);
    }

    const validateSession = async () => {
      try {
        const userData = parseValidatedUser(await validateAuth(undefined));
        if (userData) {
          setUser(userData);
          setUserRole(userData.role);
          hasSetRoleRef.current = true;
          if (!appSession.getToken()) {
            await refreshAccessToken();
          }
          return;
        }
      } catch (error) {
        if (!isAuthFailure(error)) {
          return;
        }

        if (isPublicAuthPath(pathname)) {
          clearSession();
          return;
        }

        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearSession();
          return;
        }

        try {
          const retryUser = parseValidatedUser(await validateAuth(undefined));
          if (retryUser) {
            setUser(retryUser);
            setUserRole(retryUser.role);
            hasSetRoleRef.current = true;
            return;
          }
          clearSession();
        } catch (retryError) {
          if (isAuthFailure(retryError)) {
            clearSession();
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Cold-reload path: no in-memory access token (we no longer persist it
     * to localStorage). The httpOnly refresh-token cookie still rides
     * automatically. On a public path we stay quiet; elsewhere we attempt
     * a refresh and then validate. If refresh fails the validateSession
     * catch branch will clear and redirect.
     */
    if (!appSession.getToken()) {
      if (isPublicAuthPath(pathname)) {
        setIsLoading(false);
        return;
      }
      void (async () => {
        await refreshAccessToken();
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
    setLoginLockoutUntil,
    setUser,
    setUserRole,
    validateAuth,
    hasSetRoleRef,
  ]);

  // Cross-tab logout previously rode the `storage` event watching
  // `docita_token`. Since we no longer persist the token, that channel
  // is gone. Tabs converge on the next API call: a logged-out tab will
  // receive a 401 → refresh fails → clearSession → redirect. If we want
  // instant cross-tab signaling later, switch to BroadcastChannel.
}
