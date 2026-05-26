"use client";

import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/monitoring/logger";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  clearLegacyUserStorage,
  clearSensitiveClientStorageOnLogout,
  persistVerificationEmailStatus,
  type User,
} from "./auth-context-helpers";
import type { AuthContextType } from "./auth-context.types";
import {
  persistLoginLockoutUntil,
  readLoginLockoutUntil,
} from "./auth-lockout";
import { clearStoredReturnPathBeforeLogin } from "./safe-return-path";
import { appSession } from "./session";
import {
  useAuthCredentialActions,
  useAuthRefreshUser,
} from "./use-auth-credential-actions";
import { useAuthIdleLogout } from "./use-auth-idle-logout";
import { useAuthMutations } from "./use-auth-mutations";
import { useAuthSessionBootstrap } from "./use-auth-session-bootstrap";

export function useAuthProviderValue(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => appSession.getToken());
  const [isLoading, setIsLoading] = useState(true);
  const [loginLockoutUntil, setLoginLockoutUntil] = useState<number | null>(
    () => readLoginLockoutUntil(),
  );
  const isAuthenticated = !!user;
  const isLoginLocked = !!loginLockoutUntil && loginLockoutUntil > Date.now();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { setUserRole } = usePermissionStore();
  const hasSetRoleRef = useRef(false);
  const {
    validateAuth,
    loginMutation,
    checkEmailMutation,
    registerMutation,
    logoutMutation,
  } = useAuthMutations();

  useEffect(() => {
    if (!loginLockoutUntil) {
      return;
    }

    if (loginLockoutUntil <= Date.now()) {
      setLoginLockoutUntil(null);
      persistLoginLockoutUntil(null);
      return;
    }

    const interval = window.setInterval(() => {
      if (loginLockoutUntil <= Date.now()) {
        setLoginLockoutUntil(null);
        persistLoginLockoutUntil(null);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [loginLockoutUntil]);

  const persistToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);
    appSession.setToken(nextToken);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    persistToken(null);
    appSession.clearSession();
    queryClient.removeQueries();
    clearLegacyUserStorage();
    // Evict PHI-bearing and session-scoped client stores so the next
    // person on this device can't read the previous user's drafts or
    // AI threads. See PHI_BEARING_LOCAL_STORAGE_KEYS for the list.
    clearSensitiveClientStorageOnLogout();
    setUserRole("");
    persistVerificationEmailStatus(null);
    setLoginLockoutUntil(null);
    persistLoginLockoutUntil(null);
    hasSetRoleRef.current = false;
  }, [persistToken, queryClient, setUserRole]);

  const refreshAccessToken = useCallback(async () => {
    const refreshed = await appSession.refreshAccessToken();
    if (refreshed) {
      persistToken(appSession.getToken());
    }
    return refreshed;
  }, [persistToken]);

  useAuthSessionBootstrap({
    validateAuth,
    refreshAccessToken,
    clearSession,
    setUser,
    setUserRole,
    setIsLoading,
    setLoginLockoutUntil,
    hasSetRoleRef,
  });

  const refreshUser = useAuthRefreshUser({
    clearSession,
    refreshAccessToken,
    setUser,
    setUserRole,
    validateAuth,
  });

  const { login, checkEmail, register } = useAuthCredentialActions({
    router,
    loginLockoutUntil,
    setLoginLockoutUntil,
    persistToken,
    refreshAccessToken,
    setUser,
    setUserRole,
    validateAuth,
    loginMutation,
    checkEmailMutation,
    registerMutation,
  });

  const logout = useCallback(
    async (options?: { redirect?: boolean }) => {
      const shouldRedirect = options?.redirect ?? true;
      clearSession();
      clearStoredReturnPathBeforeLogin();
      try {
        await logoutMutation.mutateAsync();
      } catch (error) {
        logger.warn("Logout request failed after local session clear", {
          error,
        });
      }

      if (shouldRedirect) {
        router.push("/login");
      }
    },
    [clearSession, logoutMutation, router],
  );

  useAuthIdleLogout({ isAuthenticated, pathname, logout, router });

  return {
    user,
    isAuthenticated,
    isLoading,
    refreshUser,
    isAdmin: user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR",
    isDoctor: user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR",
    isLoginLocked,
    loginLockoutUntil,
    login,
    register,
    checkEmail,
    logout,
    token,
  };
}
