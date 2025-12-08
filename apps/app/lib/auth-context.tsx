"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { usePermissionStore } from "@/lib/stores/permission-store";

interface User {
  id: string;
  name: string;
  email: string;
  role: "DOCTOR" | "RECEPTIONIST" | "ADMIN" | "ADMIN_DOCTOR" | "SUPER_ADMIN";
  clinicId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to read auth from localStorage
function getStoredAuth(): { user: User | null; token: string | null } {
  if (typeof window === "undefined") {
    return { user: null, token: null };
  }
  try {
    const storedToken = localStorage.getItem("docita_token");
    const storedUser = localStorage.getItem("docita_user");
    if (storedToken && storedUser && storedUser !== "undefined") {
      return { user: JSON.parse(storedUser), token: storedToken };
    }
  } catch {
    localStorage.removeItem("docita_token");
    localStorage.removeItem("docita_user");
  }
  return { user: null, token: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Start with null on both server and client to avoid hydration mismatch
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start loading until we check localStorage
  const router = useRouter();
  const { setUserRole } = usePermissionStore();
  const hasSetRoleRef = useRef(false);

  // Load from localStorage after component mounts (client-side only)
  useEffect(() => {
    const stored = getStoredAuth();
    if (stored.user && stored.token) {
      setUser(stored.user);
      setToken(stored.token);
      setUserRole(stored.user.role);
      hasSetRoleRef.current = true;
    }
    setIsLoading(false);
  }, [setUserRole]);

  const login = async (email: string, password: string) => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      const { access_token, user } = data;

      // Validate that user object exists
      if (!user) {
        throw new Error("Invalid login response: user data missing");
      }

      // Super admins should use the admin console instead
      if (user.role === "SUPER_ADMIN") {
        throw new Error(
          "Super Admin accounts should use the Admin Console at /admin",
        );
      }

      // Check if user has a clinic assigned
      if (!user.clinicId) {
        throw new Error(
          "Your account is not associated with any clinic. Please contact support.",
        );
      }

      setToken(access_token);
      setUser(user);
      setUserRole(user.role);
      localStorage.setItem("docita_token", access_token);
      localStorage.setItem("docita_user", JSON.stringify(user));

      // Redirect to originally requested page or dashboard
      const redirectUrl =
        sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
      sessionStorage.removeItem("redirectAfterLogin");
      router.push(redirectUrl);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };
  // ...

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("docita_token");
    localStorage.removeItem("docita_user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isAdmin: user?.role === "ADMIN" || user?.role === "ADMIN_DOCTOR",
        isDoctor: user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR",
        login,
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
