import {
  appAuthUserSchema,
  loginResponseSchema,
  registerResponseSchema,
  validateSessionResponseSchema,
  type AppAuthUser,
} from "@workspace/types";

export type User = AppAuthUser;

export interface AuthPayload {
  access_token?: string;
  verificationEmailSent?: boolean;
  user: User;
}

export const AUTH_RESPONSE_ERROR_MESSAGE =
  "We could not sign you in right now. Please try again.";

export const VERIFICATION_EMAIL_STATUS_STORAGE_KEY =
  "docita_verification_email_status";

const PUBLIC_AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/portal/login",
]);

export function isPublicAuthPath(pathname: string | null): boolean {
  return pathname ? PUBLIC_AUTH_PATHS.has(pathname) : false;
}

export function extractAuthPayload(raw: unknown): AuthPayload | null {
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

export function parseValidatedUser(raw: unknown): User | null {
  const response = validateSessionResponseSchema.safeParse(raw);
  if (response.success) {
    return appAuthUserSchema.parse(response.data.user);
  }

  if (raw && typeof raw === "object" && "user" in raw) {
    const nested = appAuthUserSchema.safeParse((raw as { user?: unknown }).user);
    if (nested.success) {
      return nested.data;
    }
  }

  const direct = appAuthUserSchema.safeParse(raw);
  return direct.success ? direct.data : null;
}

export function clearLegacyUserStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("docita_user");
}

export function isAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status =
    "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;
  return status === 401 || status === 403;
}

export function persistVerificationEmailStatus(
  status: "pending" | "failed" | null,
) {
  if (typeof window === "undefined") return;
  if (!status) {
    window.sessionStorage.removeItem(VERIFICATION_EMAIL_STATUS_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(VERIFICATION_EMAIL_STATUS_STORAGE_KEY, status);
}
