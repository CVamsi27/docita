import {
  SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_SETTINGS_PATH,
} from "@/lib/subscription/subscription-settings-path";
import { isPreClinicSetupRoute } from "@/lib/auth/pre-clinic-setup-routes";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export type ApiClientError = {
  status?: number;
  data?: unknown;
  message?: string;
  code?: string;
  isNetworkError?: boolean;
};

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

function extractErrorCode(error: ApiClientError): string | undefined {
  if (typeof error.code === "string" && error.code.length > 0) {
    return error.code;
  }

  const data = toRecord(error.data);
  const directCode = data?.code;
  if (typeof directCode === "string") return directCode;
  const nestedError = toRecord(data?.error);
  const code = nestedError?.code;
  return typeof code === "string" ? code : undefined;
}

function shouldSuppressDevToast(message: string): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const lowered = message.toLowerCase();
  return (
    lowered.includes("fast refresh") ||
    lowered.includes("next dev") ||
    lowered.includes("pnpm") ||
    lowered.includes("cache bypass, force executing") ||
    lowered.includes("prisma:error") ||
    lowered.includes("invalid `this.prisma") ||
    message.includes("\n")
  );
}

export function getRedirectPathForForbiddenCode(code?: string): string | null {
  switch (code) {
    case "EMAIL_NOT_VERIFIED":
      return "/verify-email-sent";
    case "NO_CLINIC":
      return "/choose-path";
    case "SUBSCRIPTION_INACTIVE":
    case "SUBSCRIPTION_HARD_LOCKED":
    case "TRIAL_EXPIRED":
      return SUBSCRIPTION_BILLING_RESOLVE_PATH;
    case "INSUFFICIENT_TIER":
      return SUBSCRIPTION_SETTINGS_PATH;
    case "PASSWORD_EXPIRED":
      return "/settings?tab=security";
    case "INVALID_CSRF_TOKEN":
      return "/login";
    default:
      return null;
  }
}

/**
 * Global API error hook wired into the shared fetch client.
 *
 * Must stay fast and side-effect free for auth/network failures — the client
 * awaits this handler before surfacing errors. Session refresh and login
 * redirects live in auth bootstrap + fetch-with-session instead.
 */
export async function handleApiClientError(error: ApiClientError) {
  if (
    error.status === 401 ||
    error.isNetworkError ||
    error.code === "NETWORK_ERROR" ||
    error.code === "TIMEOUT"
  ) {
    return;
  }

  const errorCode = extractErrorCode(error);
  const redirectPath =
    error.status === 403 ? getRedirectPathForForbiddenCode(errorCode) : null;

  if (redirectPath && typeof window !== "undefined") {
    window.location.assign(redirectPath);
    return;
  }

  if (
    error.status === 403 &&
    typeof window !== "undefined" &&
    isPreClinicSetupRoute(window.location.pathname)
  ) {
    return;
  }

  const fallback =
    error.status === 429
      ? "Too many attempts. Please wait a moment before trying again."
      : error.status && error.status >= 400 && error.status < 500
        ? "Please check the information and try again"
        : "Please review the information on this screen and try again";

  if (!shouldSuppressDevToast(error.message || "")) {
    showUserFacingErrorToast(
      error,
      fallback,
      error.status && error.status >= 400 && error.status < 500
        ? "form"
        : "generic",
    );
  }
}
