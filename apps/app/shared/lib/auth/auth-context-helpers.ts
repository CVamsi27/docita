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
    return {
      access_token: directRegister.data.access_token,
      verificationEmailSent: directRegister.data.verificationEmailSent,
      user: directRegister.data.user,
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
    const nested = raw.data;
    const nestedRegister = registerResponseSchema.safeParse(nested);
    if (nestedRegister.success) {
      return {
        access_token: nestedRegister.data.access_token,
        verificationEmailSent: nestedRegister.data.verificationEmailSent,
        user: nestedRegister.data.user,
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
    const nested = appAuthUserSchema.safeParse(raw.user);
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
