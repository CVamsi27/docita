import {
  appAuthUserSchema,
  loginResponseSchema,
  registerResponseSchema,
  validateSessionResponseSchema,
  type AppAuthUser,
} from "@workspace/types";

export type User = AppAuthUser;

interface AuthPayload {
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
  "/lab-portal/login",
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
  if (response.success) return appAuthUserSchema.parse(response.data.user);

  if (raw && typeof raw === "object" && "user" in raw) {
    const nested = appAuthUserSchema.safeParse(raw.user);
    if (nested.success) return nested.data;
  }

  const direct = appAuthUserSchema.safeParse(raw);
  return direct.success ? direct.data : null;
}

export function clearLegacyUserStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("docita_user");
}

/**
 * Sweep client-side stores that may contain PHI or session-scoped data
 * when the user logs out (or auth is cleared after a 401). Anything
 * that could survive the next user signing in on the same device must
 * be evicted here.
 *
 * Add new entries when you introduce a new client-side store that
 * holds anything more sensitive than UI preferences.
 */
const PHI_BEARING_LOCAL_STORAGE_KEYS = [
  "docita.ask-ai.threads.v1",
  "docita_onboarding_draft",
] as const;

const SESSION_STORAGE_PREFIXES_TO_CLEAR = [
  "docita:consultation-draft:",
  "docita.consultation",
] as const;

export function clearSensitiveClientStorageOnLogout(): void {
  if (typeof window === "undefined") return;

  try {
    for (const key of PHI_BEARING_LOCAL_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore quota / disabled storage
  }

  try {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      if (
        SESSION_STORAGE_PREFIXES_TO_CLEAR.some((p) => key.startsWith(p))
      ) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
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
