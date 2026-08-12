import {
  type ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useNavigate } from "react-router";
import { setAuthLogoutCallback } from "@/lib/api/api-client";
import { postInternalAuthLogout } from "@workspace/data-access/internal";
import { API_URL } from "@/lib/api/api-config";
import { INTERNAL_USER_KEY, internalSession } from "./session";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { useAuthState, type InternalUser } from "./use-auth-state";
import { clearAuthStorage, useAuthSession } from "./use-auth-session";

export type { InternalUser } from "./use-auth-state";
import { AuthContext } from "./auth-context-inner";

export function AuthProvider({ children }: { children: ReactNode }) {
  const authState = useAuthState();
  const navigate = useNavigate();

  const { validateToken, isInternalRole } = useAuthSession({
    updateToken: authState.updateToken,
    updateUser: authState.updateUser,
    finishLoading: authState.finishLoading,
    markMounted: authState.markMounted,
    resetAuth: authState.resetAuth,
  });

  const login = useCallback(
    (newToken: string | null, newUser: InternalUser) => {
      authState.hasLoggedOutRef.current = false;
      internalSession.setToken(newToken);
      localStorage.setItem(INTERNAL_USER_KEY, JSON.stringify(newUser));
      authState.setToken(newToken);
      authState.setUser(newUser);
    },
    [authState],
  );

  const logout = useCallback(
    (reason?: string) => {
      if (authState.hasLoggedOutRef.current && !internalSession.getToken()) {
        if (reason) {
          showUserFacingErrorToast(reason, "Please sign in again to continue", "auth");
        }
        navigate("/login", { replace: true });
        return Promise.resolve();
      }

      if (authState.logoutInFlightRef.current)
        return authState.logoutInFlightRef.current;

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

          navigate("/login", { replace: true });
          authState.logoutInFlightRef.current = null;
        }
      })();
      return authState.logoutInFlightRef.current;
    },
    [navigate, authState],
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

export { useAuth } from "./use-auth";
