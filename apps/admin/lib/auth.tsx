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
import { ADMIN_USER_KEY, adminSession } from "./session";

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
  isSuperAdmin: boolean;
  isClinicAdmin: boolean;
  login: (token: string | null, user: User) => void;
  logout: (reason?: string) => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearAuthStorage() {
  adminSession.clearSession();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    adminSession.getToken(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const validateTokenMutation = useMutation({
    mutationFn: async () => client.get("/auth/validate", { skipAuth: true }),
  });

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
        const storedUser = localStorage.getItem(ADMIN_USER_KEY);

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role === "SUPER_ADMIN") {
            await adminSession.refreshAccessToken();
            const nextToken = adminSession.getToken();
            setToken(nextToken);
            const isValid = await validateToken();

            if (isValid) {
              setUser(parsedUser);
            } else {
              clearAuthStorage();
              setToken(null);
              setUser(null);
              toast.error("Session expired. Please log in again.");
            }
          } else {
            clearAuthStorage();
          }
        }
      } catch {
        clearAuthStorage();
      }

      setIsLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [validateToken]);

  useEffect(() => {
    if (isLoading || !isMounted) return;

    const isProtectedRoute =
      pathname?.startsWith("/dashboard") || pathname?.startsWith("/clinic");
    const isAuthenticatedSuperAdmin = !!user && user.role === "SUPER_ADMIN";

    if (isProtectedRoute && isAuthenticatedSuperAdmin) {
      validateToken().then((isValid) => {
        if (!isValid) {
          clearAuthStorage();
          setToken(null);
          setUser(null);
          toast.error("Your session has expired. Please log in again.");
          router.replace("/");
        }
      });
    } else if (isProtectedRoute && !isAuthenticatedSuperAdmin) {
      router.replace("/");
    }
  }, [isLoading, isMounted, pathname, token, user, router, validateToken]);

  const login = useCallback((newToken: string | null, newUser: User) => {
    adminSession.setToken(newToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(
    (reason?: string) => {
      clearAuthStorage();
      setToken(null);
      setUser(null);

      if (reason) {
        toast.error(reason);
      }

      router.replace("/");
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

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isClinicAdmin = user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isSuperAdmin,
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
