"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { API_URL } from "./api";

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

// Use distinct keys for admin app to avoid conflicts with patient app
const TOKEN_KEY = "docita_admin_token";
const USER_KEY = "docita_admin_user";
const COOKIE_KEY = "docita_admin_cookie";

// Helper to set cookie
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// Helper to delete cookie
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Validate token with backend
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
          // 401 = token expired or invalid
          // 404 = user account deleted
          const reason =
            res.status === 404
              ? "Your account has been deleted"
              : res.status === 401
                ? "Your session has expired"
                : "Your authentication is no longer valid";

          return false;
        }

        return true;
      } catch (error) {
        console.error("Token validation failed:", error);
        return false;
      }
    },
    [token],
  );

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsMounted(true);

      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Only SUPER_ADMIN can access admin app
          if (parsedUser.role === "SUPER_ADMIN") {
            // Validate token on app load
            const isValid = await validateToken(storedToken);

            if (isValid) {
              setToken(storedToken);
              setUser(parsedUser);
              setCookie(COOKIE_KEY, storedToken, 7);
            } else {
              // Token is invalid, expired, or user was deleted
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
              deleteCookie(COOKIE_KEY);
              setToken(null);
              setUser(null);
              toast.error("Session expired. Please log in again.");
            }
          } else {
            // Clear invalid auth - clinic admins should not have access
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            deleteCookie(COOKIE_KEY);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        deleteCookie(COOKIE_KEY);
      }

      setIsLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [validateToken]);

  // Handle route protection - validate token when accessing protected routes
  useEffect(() => {
    if (isLoading || !isMounted) return;

    const isProtectedRoute =
      pathname?.startsWith("/dashboard") || pathname?.startsWith("/clinic");
    const isAuthenticatedSuperAdmin =
      !!token && !!user && user.role === "SUPER_ADMIN";

    if (isProtectedRoute && isAuthenticatedSuperAdmin) {
      // Re-validate token when accessing protected route
      validateToken(token).then((isValid) => {
        if (!isValid) {
          // Token is no longer valid
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          deleteCookie(COOKIE_KEY);
          setToken(null);
          setUser(null);
          toast.error("Your session has expired. Please log in again.");
          router.replace("/");
        }
      });
    } else if (isProtectedRoute && !isAuthenticatedSuperAdmin) {
      // If not authenticated SUPER_ADMIN and trying to access protected route, redirect to login
      router.replace("/");
    }
  }, [isLoading, isMounted, pathname, token, user, router, validateToken]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setCookie(COOKIE_KEY, newToken, 7);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(
    (reason?: string) => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      deleteCookie(COOKIE_KEY);
      setToken(null);
      setUser(null);

      if (reason) {
        toast.error(reason);
      }

      router.replace("/");
    },
    [router],
  );

  // Show loading spinner during SSR and initial hydration
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
