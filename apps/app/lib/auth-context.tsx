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
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { isNetworkError } from "@/lib/network-error";
import { apiFetch } from "@/lib/api-client";
import { appSession } from "@/lib/session";
import {
  checkEmailResponseSchema,
  checkEmailSchema,
  loginResponseSchema,
  loginSchema,
  registerResponseSchema,
  registerSchema,
  type UserRole,
} from "@workspace/types";

const AUTH_RESPONSE_ERROR_MESSAGE =
  "We could not process the sign-in response. Please try again.";
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId?: string | null;
  onboardingStep?:
    | 'NOT_STARTED'
    | 'CHOOSE_PATH'
    | 'CREATING_CLINIC'
    | 'JOINING_CLINIC'
    | 'COMPLETED';
  signatureUrl?: string | null;
  registrationNumber?: string | null;
  verificationStatus?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'FAILED';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role?: "ADMIN" | "ADMIN_DOCTOR",
    clinicName?: string,
  ) => Promise<void>;
  checkEmail: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  token: string | null;
}

interface AuthPayload {
  access_token?: string;
  user: User;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

function extractAuthPayload(raw: unknown): AuthPayload | null {
  const directLogin = loginResponseSchema.safeParse(raw);
  if (directLogin.success) {
    return {
      access_token: directLogin.data.access_token,
      user: directLogin.data.user,
    };
  }

  const directRegister = registerResponseSchema.safeParse(raw);
  if (directRegister.success) {
    return {
      access_token: directRegister.data.access_token,
      user: directRegister.data.user,
    };
  }

  if (raw && typeof raw === "object" && "data" in raw) {
    const nested = (raw as { data?: unknown }).data;
    const nestedLogin = loginResponseSchema.safeParse(nested);
    if (nestedLogin.success) {
      return {
        access_token: nestedLogin.data.access_token,
        user: nestedLogin.data.user,
      };
    }

    const nestedRegister = registerResponseSchema.safeParse(nested);
    if (nestedRegister.success) {
      return {
        access_token: nestedRegister.data.access_token,
        user: nestedRegister.data.user,
      };
    }
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return appSession.getToken();
  });
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;
  const router = useRouter();
  const { setUserRole } = usePermissionStore();
  const hasSetRoleRef = useRef(false);

  const persistToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);
    appSession.setToken(nextToken);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    persistToken(null);
    appSession.clearSession();
    setUserRole("");
    hasSetRoleRef.current = false;
  }, [persistToken, setUserRole]);

  const refreshAccessToken = useCallback(async () => {
    const refreshed = await appSession.refreshAccessToken();
    if (refreshed) {
      persistToken(appSession.getToken());
    }
    return refreshed;
  }, [persistToken]);

  const validateAuthMutation = useMutation({
    mutationFn: (headers?: HeadersInit) =>
      apiFetch<{ user: User }>("/auth/validate", {
        method: "GET",
        headers,
      }),
  });

  const loginMutation = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<unknown>("/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

  const checkEmailMutation = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<unknown>("/auth/check-email", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

  const registerMutation = useMutation({
    mutationFn: (payload: unknown) =>
      apiFetch<unknown>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<unknown>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      }),
  });

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

    const validateSession = async () => {
      try {
        const data = await validateAuthMutation.mutateAsync(undefined);
        if (data?.user) {
          setUser(data.user);
          setUserRole(data.user.role);
          hasSetRoleRef.current = true;
          localStorage.setItem("docita_user", JSON.stringify(data.user));
          if (!appSession.getToken()) {
            await refreshAccessToken();
          }
          return;
        }
      } catch {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          try {
            const retryData = await validateAuthMutation.mutateAsync(undefined);
            if (retryData?.user) {
              setUser(retryData.user);
              setUserRole(retryData.user.role);
              hasSetRoleRef.current = true;
              localStorage.setItem("docita_user", JSON.stringify(retryData.user));
              return;
            }
          } catch {
            // ignore retry failures
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, [clearSession, refreshAccessToken, setUserRole, validateAuthMutation]);

  // Listen for auth changes in other tabs/windows and update in-memory state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: StorageEvent) => {
      try {
        if (e.key === "docita_user") {
          if (e.newValue) {
            const parsed = JSON.parse(e.newValue);
            setUser(parsed);
            if (parsed?.role) setUserRole(parsed.role);
          } else {
            setUser(null);
            setUserRole("");
          }
        }

        if (e.key === "docita_token") {
          setToken(e.newValue ?? null);
        }
      } catch {
        // ignore malformed storage entries
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [setUserRole]);

  const refreshUser = async () => {
    try {
      const csrfToken = appSession.getCsrfToken();
      const headers = {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
      };

      const data = await validateAuthMutation.mutateAsync(headers);
      if (data?.user) {
        setUser(data.user);
        setUserRole(data.user.role);
        localStorage.setItem("docita_user", JSON.stringify(data.user));
        return;
      }

      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryData = await validateAuthMutation.mutateAsync(headers);
        if (retryData?.user) {
          setUser(retryData.user);
          setUserRole(retryData.user.role);
          localStorage.setItem("docita_user", JSON.stringify(retryData.user));
          return;
        }
      }

      clearSession();
    } catch {
      // ignore network errors
    }
  };

  const login = async (email: string, password: string) => {
    const payload = loginSchema.parse({ email, password });
    const authPayload = extractAuthPayload(await loginMutation.mutateAsync(payload));
    const accessToken = authPayload?.access_token ?? null;
    let userData = authPayload?.user ?? null;

    if (!userData) {
      const validateData = await validateAuthMutation.mutateAsync({
        "Content-Type": "application/json",
      });
      userData = validateData?.user ?? null;
    }

    if (!userData) {
      throw new Error(AUTH_RESPONSE_ERROR_MESSAGE);
    }

    if (userData.role === "SUPER_ADMIN") {
      throw new Error(
        "Super Admin accounts should use the Admin Console at /admin",
      );
    }

    if (accessToken) {
      persistToken(accessToken);
    } else {
      await refreshAccessToken();
    }
    setUser(userData);
    setUserRole(userData.role);
    localStorage.setItem("docita_user", JSON.stringify(userData));

    if (!userData.clinicId) {
      switch (userData.onboardingStep) {
        case 'JOINING_CLINIC':
          router.push('/join-request-status');
          break;
        case 'CREATING_CLINIC':
          router.push('/onboarding');
          break;
        case 'CHOOSE_PATH':
        case 'NOT_STARTED':
        default:
          router.push('/choose-path');
      }
      return;
    }

    const redirectUrl =
      sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
    sessionStorage.removeItem("redirectAfterLogin");
    router.push(redirectUrl);
  };

  const checkEmail = async (email: string): Promise<boolean> => {
    try {
      const payload = checkEmailSchema.parse({ email });
      const data = checkEmailResponseSchema.parse(
        await checkEmailMutation.mutateAsync(payload),
      );
      return data.exists;
    } catch (error) {
      if (isNetworkError(error)) {
        return false;
      }

      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: "ADMIN" | "ADMIN_DOCTOR" = "ADMIN",
    clinicName?: string,
  ) => {
    const payload = registerSchema.parse({
      email,
      password,
      firstName,
      lastName,
      role,
      clinicName,
    });
    const authPayload = extractAuthPayload(
      await registerMutation.mutateAsync(payload),
    );
    const accessToken = authPayload?.access_token ?? null;
    let userData = authPayload?.user ?? null;

    if (!userData) {
      const validateData = await validateAuthMutation.mutateAsync({
        "Content-Type": "application/json",
      });
      userData = validateData?.user ?? null;
    }

    if (!userData) {
      throw new Error(
        "We could not process the registration response. Please try again.",
      );
    }

    if (accessToken) {
      persistToken(accessToken);
    } else {
      await refreshAccessToken();
    }
    setUser(userData);
    setUserRole(userData.role);
    localStorage.setItem("docita_user", JSON.stringify(userData));

    if (!userData.clinicId) {
      switch (userData.onboardingStep) {
        case 'JOINING_CLINIC':
          router.push('/join-request-status');
          break;
        case 'CREATING_CLINIC':
          router.push('/onboarding');
          break;
        case 'CHOOSE_PATH':
        case 'NOT_STARTED':
        default:
          router.push('/choose-path');
      }
      return;
    }

    router.push('/dashboard');
  };

  const logout = useCallback(async () => {
    clearSession();
    try {
      await logoutMutation.mutateAsync();
    } catch {}

    router.push("/login");
  }, [clearSession, logoutMutation, router]);

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
        refreshUser,
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
