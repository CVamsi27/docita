"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setAuthLogoutCallback } from "../api/api-client";
import { postInternalAuthLogout } from "@workspace/data-access/internal";
import { API_URL } from "../api/api-config";
import { INTERNAL_USER_KEY, internalSession } from "./session";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useAuthState } from "./use-auth-state";
import { clearAuthStorage, useAuthSession } from "./use-auth-session";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  clinicId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInternal: boolean;
  login: (token: string | null, user: User) => void;
  logout: (reason?: string) => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();
  const router = useRouter();

  const { validateToken, isInternalRole } = useAuthSession({
    updateToken: authState.updateToken,
    updateUser: authState.updateUser,
    finishLoading: authState.finishLoading,
    markMounted: authState.markMounted,
    resetAuth: authState.resetAuth,
  });

  const login = useCallback((newToken: string | null, newUser: User) => {
    authState.hasLoggedOutRef.current = false;
    internalSession.setToken(newToken);
    localStorage.setItem(INTERNAL_USER_KEY, JSON.stringify(newUser));
    authState.setToken(newToken);
    authState.setUser(newUser);
  }, [authState]);

  const logout = useCallback(
    (reason?: string) => {
      if (authState.hasLoggedOutRef.current && !internalSession.getToken()) {
        if (reason) {
          showUserFacingErrorToast(reason, "Please sign in again to continue", "auth");
        }
        router.replace("/");
        return Promise.resolve();
      }

      if (authState.logoutInFlightRef.current) return authState.logoutInFlightRef.current;

      authState.logoutInFlightRef.current = (async () => {
        try {
          if (internalSession.getToken()) {
            const csrfToken = internalSession.getCsrfToken();
            await postInternalAuthLogout(API_URL, {
              ...(csrfToken ? { "x-xsrf-token": csrfToken } : {}),
            });
          }
        } catch {
          // Logout should still complete locally if the backend call fails.
        } finally {
          clearAuthStorage();
          authState.setToken(null);
          authState.setUser(null);
          authState.hasLoggedOutRef.current = true;

          if (reason) {
            showUserFacingErrorToast(
              reason,
              "Please sign in again to continue",
              "auth",
            );
          }

          router.replace("/");
          authState.logoutInFlightRef.current = null;
        }
      })();
      return authState.logoutInFlightRef.current;
    },
    [router, authState],
  );

  useEffect(() => {
    setAuthLogoutCallback((reason) => logout(reason));
    return () => setAuthLogoutCallback(null);
  }, [logout]);

  if (!authState.isMounted || authState.isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3"
        role="status"
        aria-label="Loading"
      >
        <DocitaLoadingIndicator variant="page" withStatusRole={false} />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const isInternal = isInternalRole(authState.user?.role);

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        token: authState.token,
        isLoading: authState.isLoading,
        isAuthenticated: !!authState.user,
        isInternal,
        login,
        logout,
        validateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
