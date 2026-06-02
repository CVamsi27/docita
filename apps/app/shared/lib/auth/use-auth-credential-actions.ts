"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useCallback } from "react";
import {
  checkEmailResponseSchema,
  checkEmailSchema,
  loginSchema,
  registerSchema,
} from "@workspace/types";
import { isRecord } from "@workspace/utils";
import {
  AUTH_RESPONSE_ERROR_MESSAGE,
  extractAuthPayload,
  parseValidatedUser,
  type User,
} from "./auth-context-helpers";
import {
  formatLoginLockoutMessage,
  parseLoginLockoutUntil,
  persistLoginLockoutUntil,
} from "./auth-lockout";
import {
  routeUserAfterLogin,
  routeUserAfterRegister,
} from "./auth-post-login-routing";
import { appSession } from "./session";

type ValidateAuth = (headers?: Record<string, string>) => Promise<unknown>;

export function useAuthCredentialActions(options: {
  router: AppRouterInstance;
  loginLockoutUntil: number | null;
  setLoginLockoutUntil: (until: number | null) => void;
  persistToken: (token: string | null) => void;
  refreshAccessToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setUserRole: (role: string) => void;
  validateAuth: ValidateAuth;
  loginMutation: { mutateAsync: (payload: unknown) => Promise<unknown> };
  checkEmailMutation: { mutateAsync: (payload: unknown) => Promise<unknown> };
  registerMutation: { mutateAsync: (payload: unknown) => Promise<unknown> };
}) {
  const {
    router,
    loginLockoutUntil,
    setLoginLockoutUntil,
    persistToken,
    refreshAccessToken,
    setUser,
    setUserRole,
    validateAuth,
    loginMutation,
    checkEmailMutation,
    registerMutation,
  } = options;

  const login = async (email: string, password: string) => {
    const payload = loginSchema.parse({ email, password });
    if (loginLockoutUntil && loginLockoutUntil > Date.now()) {
      throw new Error(formatLoginLockoutMessage(loginLockoutUntil));
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

      routeUserAfterLogin(userData, router);
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
        throw new Error(formatLoginLockoutMessage(lockoutUntil));
      }

      if (status === 401) {
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

    routeUserAfterRegister(userData, router, verificationEmailSent);
  };

  return { login, checkEmail, register };
}

export function useAuthRefreshUser(options: {
  clearSession: () => void;
  refreshAccessToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setUserRole: (role: string) => void;
  validateAuth: ValidateAuth;
}) {
  const {
    clearSession,
    refreshAccessToken,
    setUser,
    setUserRole,
    validateAuth,
  } = options;

  return useCallback(async (): Promise<User | null> => {
    try {
      const csrfToken = appSession.getCsrfToken();
      const headers = {
        "Content-Type": "application/json",
        ...(csrfToken ? { "x-xsrf-token": csrfToken } : {}),
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
  }, [clearSession, refreshAccessToken, setUser, setUserRole, validateAuth]);
}
