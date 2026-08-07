import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/monitoring/logger";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { clearEffectivePermissionsCache } from "@/lib/access-control/use-effective-permissions";
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
import { isAdmin, isDoctor } from "@/lib/auth/permissions";
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
  const [token, setToken] = useState<string | null>(() =>
    appSession.getToken(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isApiStarting, setIsApiStarting] = useState(false);
  const [loginLockoutUntil, setLoginLockoutUntil] = useState<number | null>(
    () => readLoginLockoutUntil(),
  );
  const isAuthenticated = !!user;
  const isLoginLocked = !!loginLockoutUntil && loginLockoutUntil > Date.now();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
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
    // C7: never let a second user in the same tab inherit the previous
    // user's permission snapshot.
    clearEffectivePermissionsCache();
    clearLegacyUserStorage();
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
    setIsApiStarting,
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
    navigate,
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
        navigate("/login");
      }
    },
    [clearSession, logoutMutation, navigate],
  );

  useAuthIdleLogout({ isAuthenticated, pathname, logout, navigate });

  return {
    user,
    isAuthenticated,
    isLoading,
    isApiStarting,
    refreshUser,
    isAdmin: isAdmin(user?.role),
    isDoctor: isDoctor(user?.role),
    isLoginLocked,
    loginLockoutUntil,
    login,
    register,
    checkEmail,
    logout,
    token,
  };
}