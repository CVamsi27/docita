import type { NavigateFunction } from "react-router";
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
  MFA_CHALLENGE_ERROR_MESSAGE,
  extractAuthPayload,
  isMfaChallengeResponse,
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
  navigate: NavigateFunction;
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
    navigate,
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

  const login = async (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => {
    const payload = loginSchema.parse({
      email,
      password,
      ...(turnstileToken ? { turnstileToken } : {}),
    });
    if (loginLockoutUntil && loginLockoutUntil > Date.now())
      throw new Error(formatLoginLockoutMessage(loginLockoutUntil));

    try {
      const loginResponse = await loginMutation.mutateAsync(payload);
      if (isMfaChallengeResponse(loginResponse)) {
        throw new Error(MFA_CHALLENGE_ERROR_MESSAGE);
      }
      const authPayload = extractAuthPayload(loginResponse);
      const accessToken = authPayload?.access_token ?? null;
      let userData = authPayload?.user ?? null;

      if (!userData) {
        userData = parseValidatedUser(
          await validateAuth({
            "Content-Type": "application/json",
          }),
        );
      }

      if (!userData) throw new Error(AUTH_RESPONSE_ERROR_MESSAGE);

      if (userData.role === "INTERNAL")
        throw new Error(
          "Internal accounts should use the Internal Console at /internal",
        );

      if (accessToken) {
        persistToken(accessToken);
      } else {
        await refreshAccessToken();
      }
      setUser(userData);
      setUserRole(userData.role);
      setLoginLockoutUntil(null);
      persistLoginLockoutUntil(null);

      routeUserAfterLogin(userData, navigate);
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

      if (status === 401) throw { code: "INVALID_CREDENTIALS" } as const;

      if (error) throw error;

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
    turnstileToken?: string,
  ) => {
    const payload = registerSchema.parse({
      email,
      password,
      firstName,
      lastName,
      role,
      clinicName,
      ...(turnstileToken ? { turnstileToken } : {}),
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

    if (!userData)
      throw new Error(
        "We could not finish creating your account. Please try again.",
      );

    if (accessToken) {
      persistToken(accessToken);
    } else {
      await refreshAccessToken();
    }
    setUser(userData);
    setUserRole(userData.role);

    routeUserAfterRegister(userData, navigate, verificationEmailSent);
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
