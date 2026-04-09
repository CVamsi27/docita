"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { client, setAuthLogoutCallback } from "./api-client";
import { API_URL, MAIN_APP_URL } from "./api-config";
import { INTERNAL_USER_KEY, internalSession } from "./session";

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

  const router = useRouter();
  const pathname = usePathname();
  const validateTokenMutation = useMutation({
    mutationFn: async () => client.get("/auth/validate"),
  });

  const isInternalRole = useCallback(
    (role?: string | null) => role === "INTERNAL",
    [],
  );

  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      await validateTokenMutation.mutateAsync();
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
      return false;
    }
  }, [validateTokenMutation]);

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
                  toast.error("Session expired. Please log in again.");
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
                toast.error("Session expired. Please log in again.");
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

  useEffect(() => {
    if (isLoading || !isMounted) return;

    const isProtectedRoute = pathname?.startsWith("/dashboard");
    const isAuthenticatedInternal = !!user && isInternalRole(user.role);

    if (isProtectedRoute && isAuthenticatedInternal) {
      validateToken().then((isValid) => {
        if (!isValid) {
          clearAuthStorage();
          setToken(null);
          setUser(null);
          toast.error("Your session has expired. Please log in again.");
          router.replace("/");
        }
      });
    } else if (isProtectedRoute && user) {
      window.location.replace(getMainAppLoginUrl());
    }
  }, [isLoading, isMounted, pathname, user, router, validateToken, isInternalRole]);

  const login = useCallback((newToken: string | null, newUser: User) => {
    internalSession.setToken(newToken);
    localStorage.setItem(INTERNAL_USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(
    (reason?: string) => {
      void (async () => {
        try {
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
        } catch {
          // Logout should still complete locally if the backend call fails.
        } finally {
          clearAuthStorage();
          setToken(null);
          setUser(null);

          if (reason) {
            toast.error(reason);
          }

          router.replace("/");
        }
      })();
    },
    [router],
  );

  useEffect(() => {
    setAuthLogoutCallback((reason) => logout(reason));
    return () => setAuthLogoutCallback(null);
  }, [logout]);

  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
