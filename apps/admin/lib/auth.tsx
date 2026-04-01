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
import { toast } from "sonner";
import { setAuthLogoutCallback } from "./api-client";
import { API_URL } from "./api-config";
import {
  ADMIN_COOKIE_KEY,
  ADMIN_USER_KEY,
  adminSession,
} from "./session";

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
  login: (token: string, user: User) => void;
  logout: (reason?: string) => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function clearAuthStorage() {
  adminSession.clearSession();
  deleteCookie(ADMIN_COOKIE_KEY);
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

  const validateToken = useCallback(
    async (tokenToValidate?: string): Promise<boolean> => {
      const tokenValue = tokenToValidate || token;
      if (!tokenValue) return false;

      try {
        const res = await fetch(`${API_URL}/auth/validate`, {
          method: "GET",
          headers: { Authorization: `Bearer ${tokenValue}` },
        });

        if (!res.ok) {
          if (res.status === 404 || res.status === 401) {
            clearAuthStorage();
            return false;
          }
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    [token],
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsMounted(true);

      try {
        const storedToken = adminSession.getToken();
        const storedUser = localStorage.getItem(ADMIN_USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role === "SUPER_ADMIN") {
            const isValid = await validateToken(storedToken);

            if (isValid) {
              setToken(storedToken);
              setUser(parsedUser);
              setCookie(ADMIN_COOKIE_KEY, storedToken, 7);
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
    const isAuthenticatedSuperAdmin =
      !!token && !!user && user.role === "SUPER_ADMIN";

    if (isProtectedRoute && isAuthenticatedSuperAdmin) {
      validateToken(token).then((isValid) => {
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

  const login = useCallback((newToken: string, newUser: User) => {
    adminSession.setToken(newToken);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(newUser));
    setCookie(ADMIN_COOKIE_KEY, newToken, 7);
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
        isAuthenticated: !!token && !!user,
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
