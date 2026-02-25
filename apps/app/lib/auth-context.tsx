"use client";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { parseApiErrorResponse } from "@/lib/api-error";
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
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api/v1";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];
  return token ? decodeURIComponent(token) : null;
}

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;
  const router = useRouter();
  const { setUserRole } = usePermissionStore();
  const hasSetRoleRef = useRef(false);

  useEffect(() => {
    const cachedUser = getStoredUser();
    if (cachedUser) {
      setUser(cachedUser);
      setUserRole(cachedUser.role);
      hasSetRoleRef.current = true;
    } else {
      setIsLoading(false);
      return;
    }

    fetch(`${API_URL}/auth/validate`, { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setUserRole(data.user.role);
          hasSetRoleRef.current = true;
          localStorage.setItem("docita_user", JSON.stringify(data.user));
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem("docita_user");
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [setUserRole]);

  const login = async (email: string, password: string) => {
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw await parseApiErrorResponse(response, "Login failed");
      }

      const data = await response.json();
      const { access_token, user: userData } = data;

      if (!userData) {
        throw new Error("Invalid login response: user data missing");
      }

      if (userData.role === "SUPER_ADMIN") {
        throw new Error(
          "Super Admin accounts should use the Admin Console at /admin",
        );
      }

      if (!userData.clinicId) {
        throw new Error(
          "Your account is not associated with any clinic. Please contact support.",
        );
      }

      setToken(access_token);
      setUser(userData);
      setUserRole(userData.role);
      localStorage.setItem("docita_user", JSON.stringify(userData));

      const redirectUrl =
        sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
      sessionStorage.removeItem("redirectAfterLogin");
      router.push(redirectUrl);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const checkEmail = async (email: string): Promise<boolean> => {
    try {
      const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api/v1";
      const csrfToken = getCsrfToken();
      const response = await fetch(`${apiUrl}/auth/check-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw await parseApiErrorResponse(response, "Email check failed");
      }

      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error(error);
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
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
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
        throw await parseApiErrorResponse(response, "Registration failed");
      }

      const data = await response.json();
      const { access_token, user: userData } = data;

      if (!userData) {
        throw new Error("Invalid registration response: user data missing");
      }

      setToken(access_token);
      setUser(userData);
      setUserRole(userData.role);
      localStorage.setItem("docita_user", JSON.stringify(userData));

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = useCallback(() => {
    const csrfToken = getCsrfToken();
    fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
      },
      body: JSON.stringify({}),
    }).catch(() => {});

    setUser(null);
    setToken(null);
    localStorage.removeItem("docita_user");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          logout();
        },
        30 * 60 * 1000,
      );
    };

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];

    resetTimer();

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
