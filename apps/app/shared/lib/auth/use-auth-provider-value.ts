"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkEmailResponseSchema,
  checkEmailSchema,
  loginSchema,
  registerSchema,
} from "@workspace/types";
import { isRecord } from "@workspace/utils";
import { logger } from "@/lib/monitoring/logger";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  AUTH_RESPONSE_ERROR_MESSAGE,
  clearLegacyUserStorage,
  extractAuthPayload,
  isAuthFailure,
  isPublicAuthPath,
  parseValidatedUser,
  persistVerificationEmailStatus,
  type User,
} from "./auth-context-helpers";
import type { AuthContextType } from "./auth-context.types";
import {
  formatLoginLockoutMessage,
  parseLoginLockoutUntil,
  persistLoginLockoutUntil,
  readLoginLockoutUntil,
} from "./auth-lockout";
import { clearStoredReturnPathBeforeLogin } from "./safe-return-path";
import { appSession } from "./session";
import { useAuthMutations } from "./use-auth-mutations";

export function useAuthProviderValue(): AuthContextType {
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
  const pathname = usePathname();
  const { setUserRole } = usePermissionStore();
  const hasSetRoleRef = useRef(false);
  const hasInitializedSessionRef = useRef(false);
  const {
    validateAuth,
    loginMutation,
    checkEmailMutation,
    registerMutation,
    logoutMutation,
  } = useAuthMutations();

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
    clearLegacyUserStorage();
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

  useEffect(() => {
    if (hasInitializedSessionRef.current) {
      return;
    }
    hasInitializedSessionRef.current = true;

    const persistedLockoutUntil = readLoginLockoutUntil();
    clearLegacyUserStorage();
    if (persistedLockoutUntil) {
      setLoginLockoutUntil(persistedLockoutUntil);
    }

    if (!appSession.getToken()) {
      setIsLoading(false);
      return;
    }

    const validateSession = async () => {
      try {
        const userData = parseValidatedUser(await validateAuth(undefined));
        if (userData) {
          setUser(userData);
          setUserRole(userData.role);
          hasSetRoleRef.current = true;
          if (!appSession.getToken()) {
            await refreshAccessToken();
          }
          return;
        }
      } catch (error) {
        if (!isAuthFailure(error)) {
          return;
        }

        if (isPublicAuthPath(pathname)) {
          clearSession();
          return;
        }

        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearSession();
          return;
        }

        try {
          const retryUser = parseValidatedUser(await validateAuth(undefined));
          if (retryUser) {
            setUser(retryUser);
            setUserRole(retryUser.role);
            hasSetRoleRef.current = true;
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
  }, [clearSession, pathname, refreshAccessToken, setUserRole, validateAuth]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: StorageEvent) => {
      try {
        if (e.key === "docita_token" && !e.newValue) {
          setUser(null);
          setUserRole("");
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

      const userData = parseValidatedUser(await validateAuth(headers));
      if (userData) {
        setUser(userData);
        setUserRole(userData.role);
        return userData;
      }

      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const retryUser = parseValidatedUser(await validateAuth(headers));
        if (retryUser) {
          setUser(retryUser);
          setUserRole(retryUser.role);
          return retryUser;
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
      const message = formatLoginLockoutMessage(loginLockoutUntil);
      throw new Error(message);
    }

    try {
      const authPayload = extractAuthPayload(
        await loginMutation.mutateAsync(payload),
      );
      const accessToken = authPayload?.access_token ?? null;
      let userData = authPayload?.user ?? null;

      if (!userData) {
        userData = parseValidatedUser(
          await validateAuth({
            "Content-Type": "application/json",
          }),
        );
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
      }
    } catch (error) {
      const status = isRecord(error) ? Number(error.status) : undefined;
      const data = isRecord(error) ? error.data : null;
      const lockoutUntil =
        typeof status === "number"
          ? parseLoginLockoutUntil(status, data)
          : null;

      if (lockoutUntil) {
        setLoginLockoutUntil(lockoutUntil);
        persistLoginLockoutUntil(lockoutUntil);
        const message = formatLoginLockoutMessage(lockoutUntil);
        throw new Error(message);
      }

      if (status === 401) {
        // Preserve a safe, specific error for invalid credentials.
        throw { code: "INVALID_CREDENTIALS" } as const;
      }

      if (error) {
        throw error;
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
      userData = parseValidatedUser(
        await validateAuth({
          "Content-Type": "application/json",
        }),
      );
    }

    if (!userData) {
      throw new Error(
        "We could not finish creating your account. Please try again.",
      );
    }

    if (accessToken) {
      persistToken(accessToken);
    } else {
      await refreshAccessToken();
    }
    setUser(userData);
    setUserRole(userData.role);

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

  const logout = useCallback(
    async (options?: { redirect?: boolean }) => {
      const shouldRedirect = options?.redirect ?? true;
      clearSession();
      clearStoredReturnPathBeforeLogin();
      try {
        await logoutMutation.mutateAsync();
      } catch (error) {
        logger.warn("Logout request failed after local session clear", {
          error,
        });
      }

      if (shouldRedirect) {
        router.push("/login");
      }
    },
    [clearSession, logoutMutation, router],
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;
    let deadlineMs = 0;

    const MAX_TIMEOUT_MS = 2_147_483_647;

    const scheduleLogout = () => {
      if (!deadlineMs) return;
      if (timeoutId) clearTimeout(timeoutId);
      const remaining = deadlineMs - Date.now();
      const nextDelay = Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS);

      timeoutId = setTimeout(() => {
        const stillRemaining = deadlineMs - Date.now();
        if (stillRemaining > 0) {
          scheduleLogout();
          return;
        }
        const isPublicRoute =
          !!pathname &&
          typeof appSession.isPublicPath === "function" &&
          appSession.isPublicPath(pathname);
        void logout({ redirect: !isPublicRoute });
      }, nextDelay);
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      deadlineMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
      scheduleLogout();
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
  }, [isAuthenticated, logout, pathname]);

  return {
    user,
    isAuthenticated,
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
  };
}
