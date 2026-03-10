

"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "CLINIC_ADMIN" | "DOCTOR" | "STAFF" | "PATIENT";
  clinicId?: string;
  clinicName?: string;
  permissions: Permission[];
  isVerified: boolean;
  createdAt: string;
}

export type Permission =
  | "VIEW_PATIENTS"
  | "CREATE_PATIENTS"
  | "EDIT_PATIENTS"
  | "DELETE_PATIENTS"
  | "VIEW_APPOINTMENTS"
  | "CREATE_APPOINTMENTS"
  | "EDIT_APPOINTMENTS"
  | "DELETE_APPOINTMENTS"
  | "VIEW_CONSULTATIONS"
  | "CREATE_CONSULTATIONS"
  | "EDIT_CONSULTATIONS"
  | "VIEW_INVOICES"
  | "CREATE_INVOICES"
  | "EDIT_INVOICES"
  | "VIEW_PRESCRIPTIONS"
  | "CREATE_PRESCRIPTIONS"
  | "EDIT_PRESCRIPTIONS"
  | "VIEW_SETTINGS"
  | "EDIT_SETTINGS"
  | "VIEW_ANALYTICS"
  | "VIEW_STAFF"
  | "CREATE_STAFF"
  | "EDIT_STAFF"
  | "DELETE_STAFF"
  | "MANAGE_BILLING"
  | "MANAGE_SUBSCRIPTIONS"
  | "VIEW_AUDIT_LOGS"
  | "ADMIN_PANEL";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: string) => boolean;
  canAccess: (requiredPermissions: Permission[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return token ? decodeURIComponent(token) : null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (err) {

        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const userData = await response.json();
      setUser(userData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      const csrfToken = getCsrfToken();
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
        },
        body: JSON.stringify({}),
      });
    } catch (err) {

    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/auth/register", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        if (!response.ok) {
          throw new Error("Registration failed");
        }

        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Registration failed";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {

      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      return user?.permissions.includes(permission) ?? false;
    },
    [user],
  );

  const hasRole = useCallback(
    (role: string): boolean => {
      return user?.role === role;
    },
    [user],
  );

  const canAccess = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      return requiredPermissions.every((perm) =>
        user?.permissions.includes(perm),
      );
    },
    [user],
  );

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    register,
    refreshAuth,
    hasPermission,
    hasRole,
    canAccess,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

export function useRole(role: string): boolean {
  const { hasRole } = useAuth();
  return hasRole(role);
}

export function useCanAccess(permissions: Permission[]): boolean {
  const { canAccess } = useAuth();
  return canAccess(permissions);
}

export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}
