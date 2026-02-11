"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { usePermissionStore } from "@/lib/stores/permission-store";
import type { UserRole } from "@workspace/types";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    clinicName?: string,
  ) => Promise<void>;
  checkEmail: (email: string) => Promise<boolean>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

// Helper to read cached user from localStorage (token is in HttpOnly cookie)
function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const storedUser = localStorage.getItem("docita_user");
    if (storedUser && storedUser !== "undefined") {
      return JSON.parse(storedUser);
    }
  } catch {
    localStorage.removeItem("docita_user");
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Start with null on both server and client to avoid hydration mismatch
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until we check localStorage
  const isAuthenticated = !!user;
  const router = useRouter();
  const { setUserRole } = usePermissionStore();
  const hasSetRoleRef = useRef(false);

  // On mount: restore user from localStorage cache, then validate via cookie
  useEffect(() => {
    const cachedUser = getStoredUser();
    if (cachedUser) {
      // Optimistic restore from cache
      setUser(cachedUser);
      setUserRole(cachedUser.role);
      hasSetRoleRef.current = true;
    }

    // Validate session via HttpOnly cookie
    fetch(`${API_URL}/auth/validate`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setUserRole(data.user.role);
          hasSetRoleRef.current = true;
          localStorage.setItem("docita_user", JSON.stringify(data.user));
        } else {
          // Cookie invalid/expired — clear state
          setUser(null);
          setToken(null);
          localStorage.removeItem("docita_user");
        }
      })
      .catch(() => {
        // Network error — keep cached user if available
      })
      .finally(() => setIsLoading(false));
  }, [setUserRole]);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const { access_token, user } = data;

      if (!user) {
        throw new Error("Invalid login response: user data missing");
      }

      if (user.role === "SUPER_ADMIN") {
        throw new Error(
          "Super Admin accounts should use the Admin Console at /admin",
        );
      }

      if (!user.clinicId) {
        throw new Error(
          "Your account is not associated with any clinic. Please contact support.",
        );
      }

      setToken(access_token); // Keep in state for WebSocket auth
      setUser(user);
      setUserRole(user.role);
      localStorage.setItem("docita_user", JSON.stringify(user));

      const redirectUrl =
        sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
      sessionStorage.removeItem("redirectAfterLogin");
      router.push(redirectUrl);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const checkEmail = async (email: string): Promise<boolean> => {
    try {
      const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Email check failed");
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error("Email check error:", error);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    clinicName?: string,
  ) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          clinicName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();
      const { access_token, user } = data;

      if (!user) {
        throw new Error("Invalid registration response: user data missing");
      }

      setToken(access_token);
      setUser(user);
      setUserRole(user.role);
      localStorage.setItem("docita_user", JSON.stringify(user));

      router.push("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logout = React.useCallback(() => {
    // Revoke refresh token on server & clear cookies
    fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch(() => {}); // Fire and forget

    setUser(null);
    setToken(null);
    localStorage.removeItem("docita_user");
    router.push("/login");
  }, [router]);

  // 15-minute idle timeout for session security (Healthcare Compliance)
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          console.warn("Session timed out due to inactivity.");
          logout();
        },
        30 * 60 * 1000,
      ); // 30 minutes
    };

    // Events to track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    // Initialize timer
    resetTimer();

    // Add listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR",
        isDoctor: user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR",
        login,
        register,
        checkEmail,
        logout,
        token,
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
