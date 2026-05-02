"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { client, setAuthLogoutCallback } from "./api-client";
import { API_URL, MAIN_APP_URL } from "./api-config";
import { INTERNAL_USER_KEY, internalSession } from "./session";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

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
  isClinicAdmin: boolean;
  login: (token: string | null, user: User) => void;
  logout: (reason?: string) => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearAuthStorage() {
  internalSession.clearSession();
}

function getMainAppLoginUrl() {
  return `${MAIN_APP_URL.replace(/\/$/, "")}/login`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    internalSession.getToken(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const logoutInFlightRef = useRef<Promise<void> | null>(null);
  const hasLoggedOutRef = useRef(false);

  const router = useRouter();
  const validateTokenRequest = useCallback(async () => client.get("/auth/validate"), []);

  const isInternalRole = useCallback(
    (role?: string | null) => role === "INTERNAL",
    [],
  );

  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      await validateTokenRequest();
      return true;
    } catch (error) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : undefined;
      if (status === 404 || status === 401) {
        clearAuthStorage();
        return false;
      }

      if (status === 429) {
        return true;
      }

      return false;
    }
  }, [validateTokenRequest]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsMounted(true);

      try {
        const storedUser = localStorage.getItem(INTERNAL_USER_KEY);
        const storedToken = internalSession.getToken();

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (isInternalRole(parsedUser.role)) {
            if (storedToken) {
              setToken(storedToken);
              const isValid = await validateToken();

              if (isValid) {
                setUser(parsedUser);
              } else {
                const refreshed = await internalSession.refreshAccessToken();
                const nextToken = internalSession.getToken();
                setToken(nextToken);

                if (refreshed && nextToken && (await validateToken())) {
                  setUser(parsedUser);
                } else {
                  clearAuthStorage();
                  setToken(null);
                  setUser(null);
                  showUserFacingErrorToast(
                    null,
                    "Please sign in again to continue",
                    "auth",
                  );
                }
              }
            } else {
              const refreshed = await internalSession.refreshAccessToken();
              const nextToken = internalSession.getToken();
              setToken(nextToken);

              if (refreshed && nextToken && (await validateToken())) {
                setUser(parsedUser);
              } else {
                clearAuthStorage();
                setToken(null);
                setUser(null);
                showUserFacingErrorToast(
                  null,
                  "Please sign in again to continue",
                  "auth",
                );
              }
            }
          } else {
            clearAuthStorage();
            window.location.replace(getMainAppLoginUrl());
          }
        }
      } catch {
        clearAuthStorage();
      }

      setIsLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [isInternalRole, validateToken]);

  const login = useCallback((newToken: string | null, newUser: User) => {
    hasLoggedOutRef.current = false;
    internalSession.setToken(newToken);
    localStorage.setItem(INTERNAL_USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(
    (reason?: string) => {
      if (hasLoggedOutRef.current && !internalSession.getToken()) {
        if (reason) {
          showUserFacingErrorToast(reason, "Please sign in again to continue", "auth");
        }
        router.replace("/");
        return Promise.resolve();
      }

      if (logoutInFlightRef.current) {
        return logoutInFlightRef.current;
      }

      logoutInFlightRef.current = (async () => {
        try {
          if (internalSession.getToken()) {
            const csrfToken = internalSession.getCsrfToken();
            await fetch(`${API_URL}/auth/logout`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
              },
              body: JSON.stringify({}),
            });
          }
        } catch {
          // Logout should still complete locally if the backend call fails.
        } finally {
          clearAuthStorage();
          setToken(null);
          setUser(null);
          hasLoggedOutRef.current = true;

          if (reason) {
            showUserFacingErrorToast(
              reason,
              "Please sign in again to continue",
              "auth",
            );
          }

          router.replace("/");
          logoutInFlightRef.current = null;
        }
      })();
      return logoutInFlightRef.current;
    },
    [router],
  );

  useEffect(() => {
    setAuthLogoutCallback((reason) => logout(reason));
    return () => setAuthLogoutCallback(null);
  }, [logout]);

  if (!isMounted || isLoading) {
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

  const isInternal = isInternalRole(user?.role);
  const isClinicAdmin = isInternal;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isInternal,
        isClinicAdmin,
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
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
