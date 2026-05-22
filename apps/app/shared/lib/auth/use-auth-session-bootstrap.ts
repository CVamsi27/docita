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

    if (!appSession.getToken()) {
      setIsLoading(false);
      return;
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: StorageEvent) => {
      try {
        if (e.key === "docita_token" && !e.newValue) {
          setUser(null);
          setUserRole("");
        }
      } catch {
        // ignore malformed storage entries
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [setUser, setUserRole]);
}
