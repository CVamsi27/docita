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
  "We could not sign you in right now. Please try again.";
const LOGIN_LOCKOUT_STORAGE_KEY = "docita_login_lockout_until";
export const VERIFICATION_EMAIL_STATUS_STORAGE_KEY =
  "docita_verification_email_status";
const DEFAULT_LOGIN_LOCKOUT_MINUTES = 15;
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinicId?: string | null;
  emailVerified?: boolean;
  onboardingStep?:
    | "NOT_STARTED"
    | "CHOOSE_PATH"
    | "CREATING_CLINIC"
    | "JOINING_CLINIC"
    | "COMPLETED";
  signatureUrl?: string | null;
  registrationNumber?: string | null;
  verificationStatus?:
    | "UNVERIFIED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED"
    | "FAILED";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isDoctor: boolean;
  isLoginLocked: boolean;
  loginLockoutUntil: number | null;
  refreshUser: () => Promise<User | null>;
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
  verificationEmailSent?: boolean;
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
  const directRegister = registerResponseSchema.safeParse(raw);
  if (directRegister.success) {
    const registerData = directRegister.data as {
      access_token: string;
      user: User;
      verificationEmailSent?: boolean;
    };
    return {
      access_token: registerData.access_token,
      verificationEmailSent: registerData.verificationEmailSent,
      user: registerData.user,
    };
  }

  const directLogin = loginResponseSchema.safeParse(raw);
  if (directLogin.success) {
    return {
      access_token: directLogin.data.access_token,
      verificationEmailSent: undefined,
      user: directLogin.data.user,
    };
  }

  if (raw && typeof raw === "object" && "data" in raw) {
    const nested = (raw as { data?: unknown }).data;
    const nestedRegister = registerResponseSchema.safeParse(nested);
    if (nestedRegister.success) {
      const registerData = nestedRegister.data as {
        access_token: string;
        user: User;
        verificationEmailSent?: boolean;
      };
      return {
        access_token: registerData.access_token,
        verificationEmailSent: registerData.verificationEmailSent,
        user: registerData.user,
      };
    }

    const nestedLogin = loginResponseSchema.safeParse(nested);
    if (nestedLogin.success) {
      return {
        access_token: nestedLogin.data.access_token,
        verificationEmailSent: undefined,
        user: nestedLogin.data.user,
      };
    }
  }

  return null;
}

function readLoginLockoutUntil(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LOGIN_LOCKOUT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= Date.now()) {
    window.localStorage.removeItem(LOGIN_LOCKOUT_STORAGE_KEY);
    return null;
  }

  return parsed;
}

function persistLoginLockoutUntil(until: number | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (until) {
    window.localStorage.setItem(LOGIN_LOCKOUT_STORAGE_KEY, String(until));
    return;
  }

  window.localStorage.removeItem(LOGIN_LOCKOUT_STORAGE_KEY);
}

function isLoginLockoutResponse(status: number, body: unknown): boolean {
  if (status === 423) {
    return true;
  }

  if (!body || typeof body !== "object") {
    return false;
  }

  const candidate = body as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLowerCase()
      : "";

  return code === "ACCOUNT_LOCKED" || message.includes("account is locked");
}

function parseLoginLockoutUntil(status: number, body: unknown): number | null {
  if (!isLoginLockoutResponse(status, body)) {
    return null;
  }

  const candidate =
    body && typeof body === "object" ? (body as { message?: unknown }) : null;
  const message =
    typeof candidate?.message === "string" ? candidate.message : "";

  const minuteMatch = message.match(/try again in (\d+) minute\(s\)/i);
  if (minuteMatch?.[1]) {
    const minutes = Number(minuteMatch[1]);
    if (Number.isFinite(minutes) && minutes > 0) {
      return Date.now() + minutes * 60_000;
    }
  }

  const secondMatch = message.match(/try again in (\d+) second\(s\)/i);
  if (secondMatch?.[1]) {
    const seconds = Number(secondMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Date.now() + seconds * 1000;
    }
  }

  return Date.now() + DEFAULT_LOGIN_LOCKOUT_MINUTES * 60_000;
}

function formatLockoutMessage(lockoutUntil: number): string {
  const remainingMs = lockoutUntil - Date.now();
  if (remainingMs <= 0) {
    return "Your account lockout has expired. Please try signing in again.";
  }

  const minutesRemaining = Math.ceil(remainingMs / 60_000);
  return `Account is locked due to too many failed login attempts. Try again in ${minutesRemaining} minute(s).`;
}

function isAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status =
    "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;

  return status === 401 || status === 403;
}

function persistVerificationEmailStatus(status: "pending" | "failed" | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!status) {
    window.sessionStorage.removeItem(VERIFICATION_EMAIL_STATUS_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(VERIFICATION_EMAIL_STATUS_STORAGE_KEY, status);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return appSession.getToken();
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loginLockoutUntil, setLoginLockoutUntil] = useState<number | null>(
    () => readLoginLockoutUntil(),
  );
  const isAuthenticated = !!user;
  const isLoginLocked = !!loginLockoutUntil && loginLockoutUntil > Date.now();
  const router = useRouter();
  const { setUserRole } = usePermissionStore();
  const hasSetRoleRef = useRef(false);
  const hasInitializedSessionRef = useRef(false);

  useEffect(() => {
    if (!loginLockoutUntil) {
      return;
    }

    if (loginLockoutUntil <= Date.now()) {
      setLoginLockoutUntil(null);
      persistLoginLockoutUntil(null);
      return;
    }

    const interval = window.setInterval(() => {
      if (loginLockoutUntil <= Date.now()) {
        setLoginLockoutUntil(null);
        persistLoginLockoutUntil(null);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [loginLockoutUntil]);

  const persistToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);
    appSession.setToken(nextToken);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    persistToken(null);
    appSession.clearSession();
    setUserRole("");
    persistVerificationEmailStatus(null);
    setLoginLockoutUntil(null);
    persistLoginLockoutUntil(null);
    hasSetRoleRef.current = false;
  }, [persistToken, setUserRole]);

  const refreshAccessToken = useCallback(async () => {
    const refreshed = await appSession.refreshAccessToken();
    if (refreshed) {
      persistToken(appSession.getToken());
    }
    return refreshed;
  }, [persistToken]);

  const { mutateAsync: validateAuth } = useMutation({
    mutationFn: (headers?: HeadersInit) =>
      apiFetch<{ user: User }>("/auth/validate", {
        method: "GET",
        headers,
      }),
  });

  const loginMutation = useMutation({
    mutationFn: (payload: unknown) => {
      const csrfToken = appSession.getCsrfToken();
      return apiFetch<unknown>("/auth/login", {
        method: "POST",
        headers: csrfToken ? { "x-xsrf-token": csrfToken } : undefined,
        body: JSON.stringify(payload),
      });
    },
  });

  const checkEmailMutation = useMutation({
    mutationFn: (payload: unknown) => {
      const csrfToken = appSession.getCsrfToken();
      return apiFetch<unknown>("/auth/check-email", {
        method: "POST",
        headers: csrfToken ? { "x-xsrf-token": csrfToken } : undefined,
        body: JSON.stringify(payload),
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: unknown) => {
      const csrfToken = appSession.getCsrfToken();
      return apiFetch<unknown>("/auth/register", {
        method: "POST",
        headers: csrfToken ? { "x-xsrf-token": csrfToken } : undefined,
        body: JSON.stringify(payload),
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => {
      const csrfToken = appSession.getCsrfToken();
      return apiFetch<unknown>("/auth/logout", {
        method: "POST",
        headers: csrfToken ? { "x-xsrf-token": csrfToken } : undefined,
        body: JSON.stringify({}),
      });
    },
  });

  useEffect(() => {
    if (hasInitializedSessionRef.current) {
      return;
    }
    hasInitializedSessionRef.current = true;

    const persistedLockoutUntil = readLoginLockoutUntil();
    if (persistedLockoutUntil) {
      setLoginLockoutUntil(persistedLockoutUntil);
    }

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
        const data = await validateAuth(undefined);
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
      } catch (error) {
        if (!isAuthFailure(error)) {
          return;
        }

        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearSession();
          return;
        }

        try {
          const retryData = await validateAuth(undefined);
          if (retryData?.user) {
            setUser(retryData.user);
            setUserRole(retryData.user.role);
            hasSetRoleRef.current = true;
            localStorage.setItem("docita_user", JSON.stringify(retryData.user));
            return;
          }
          clearSession();
        } catch (retryError) {
          if (isAuthFailure(retryError)) {
            clearSession();
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    void validateSession();
  }, [clearSession, refreshAccessToken, setUserRole, validateAuth]);

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
      } catch {
        // ignore malformed storage entries
      }
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [setUserRole]);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const csrfToken = appSession.getCsrfToken();
      const headers = {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
      };

      const data = await validateAuth(headers);
      if (data?.user) {
        setUser(data.user);
        setUserRole(data.user.role);
        localStorage.setItem("docita_user", JSON.stringify(data.user));
        return data.user;
      }

      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryData = await validateAuth(headers);
        if (retryData?.user) {
          setUser(retryData.user);
          setUserRole(retryData.user.role);
          localStorage.setItem("docita_user", JSON.stringify(retryData.user));
          return retryData.user;
        }
      }

      clearSession();
    } catch {
      // ignore network errors
    }
    return null;
  }, [clearSession, refreshAccessToken, setUserRole, validateAuth]);

  const login = async (email: string, password: string) => {
    const payload = loginSchema.parse({ email, password });
    if (loginLockoutUntil && loginLockoutUntil > Date.now()) {
      const message = formatLockoutMessage(loginLockoutUntil);
      throw new Error(message);
    }

    try {
      const authPayload = extractAuthPayload(
        await loginMutation.mutateAsync(payload),
      );
      const accessToken = authPayload?.access_token ?? null;
      let userData = authPayload?.user ?? null;

      if (!userData) {
        const validateData = await validateAuth({
          "Content-Type": "application/json",
        });
        userData = validateData?.user ?? null;
      }

      if (!userData) {
        throw new Error(AUTH_RESPONSE_ERROR_MESSAGE);
      }

      if (userData.role === "INTERNAL") {
        throw new Error(
          "Internal accounts should use the Internal Console at /internal",
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
      setLoginLockoutUntil(null);
      persistLoginLockoutUntil(null);

      if (userData.emailVerified === false) {
        persistVerificationEmailStatus("pending");
        router.push("/verify-email-sent");
        return;
      }

      persistVerificationEmailStatus(null);
      if (!userData.clinicId) {
        switch (userData.onboardingStep) {
          case "JOINING_CLINIC":
            router.push("/join-request-status");
            break;
          case "CREATING_CLINIC":
            router.push("/onboarding");
            break;
          case "CHOOSE_PATH":
          case "NOT_STARTED":
          default:
            router.push("/choose-path");
        }
        return;
      }

      const redirectUrl =
        sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
      sessionStorage.removeItem("redirectAfterLogin");
      router.push(redirectUrl);
    } catch (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number((error as { status?: unknown }).status)
          : undefined;
      const data =
        typeof error === "object" && error !== null && "data" in error
          ? (error as { data?: unknown }).data
          : null;
      const lockoutUntil =
        typeof status === "number"
          ? parseLoginLockoutUntil(status, data)
          : null;

      if (lockoutUntil) {
        setLoginLockoutUntil(lockoutUntil);
        persistLoginLockoutUntil(lockoutUntil);
        const message = formatLockoutMessage(lockoutUntil);
        throw new Error(message);
      }

      throw new Error(AUTH_RESPONSE_ERROR_MESSAGE);
    }
  };

  const checkEmail = async (email: string): Promise<boolean> => {
    const payload = checkEmailSchema.parse({ email });
    const data = checkEmailResponseSchema.parse(
      await checkEmailMutation.mutateAsync(payload),
    );
    return data.exists;
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
    const verificationEmailSent = authPayload?.verificationEmailSent;
    let userData = authPayload?.user ?? null;

    if (!userData) {
      const validateData = await validateAuth({
        "Content-Type": "application/json",
      });
      userData = validateData?.user ?? null;
    }

    if (!userData) {
      throw new Error("We could not finish creating your account. Please try again.");
    }

    if (accessToken) {
      persistToken(accessToken);
    } else {
      await refreshAccessToken();
    }
    setUser(userData);
    setUserRole(userData.role);
    localStorage.setItem("docita_user", JSON.stringify(userData));

    if (userData.emailVerified === false) {
      persistVerificationEmailStatus(
        verificationEmailSent === false ? "failed" : "pending",
      );
      router.push("/verify-email-sent");
      return;
    }

    persistVerificationEmailStatus(null);
    if (!userData.clinicId) {
      router.push("/choose-path");
      return;
    }

    router.push("/dashboard");
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
        isLoginLocked,
        loginLockoutUntil,
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
