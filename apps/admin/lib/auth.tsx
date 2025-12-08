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
  logout: () => void;
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

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    // Defer state updates to avoid cascading renders
    const timer = setTimeout(() => {
      setIsMounted(true);

      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Only SUPER_ADMIN can access admin app
          if (parsedUser.role === "SUPER_ADMIN") {
            setToken(storedToken);
            setUser(parsedUser);
            setCookie(COOKIE_KEY, storedToken, 7);
          } else {
            // Clear invalid auth - clinic admins should not have access
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            deleteCookie(COOKIE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        deleteCookie(COOKIE_KEY);
      }

      setIsLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Handle route protection - only SUPER_ADMIN can access admin app
  useEffect(() => {
    if (isLoading || !isMounted) return;

    const isProtectedRoute =
      pathname?.startsWith("/dashboard") || pathname?.startsWith("/clinic");
    const isAuthenticatedSuperAdmin =
      !!token && !!user && user.role === "SUPER_ADMIN";

    // If not authenticated SUPER_ADMIN and trying to access protected route, redirect to login
    if (isProtectedRoute && !isAuthenticatedSuperAdmin) {
      router.replace("/");
    }
  }, [isLoading, isMounted, pathname, token, user, router]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setCookie(COOKIE_KEY, newToken, 7);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    deleteCookie(COOKIE_KEY);
    setToken(null);
    setUser(null);
    router.replace("/");
  }, [router]);

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
