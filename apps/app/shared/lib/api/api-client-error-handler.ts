import { SUBSCRIPTION_SETTINGS_PATH } from "./subscription-settings-path";
import { appSession } from "./session";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export type ApiClientError = {
  status?: number;
  data?: unknown;
  message?: string;
};

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

function extractErrorCode(value: unknown): string | undefined {
  const data = toRecord(value);
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
    case "SUBSCRIPTION_INACTIVE":
      return SUBSCRIPTION_BILLING_RESOLVE_PATH;
    case "INSUFFICIENT_TIER":
      return SUBSCRIPTION_SETTINGS_PATH;
    case "NO_CLINIC":
      return "/choose-path";
    default:
      return null;
  }
}

export async function handleApiClientError(error: ApiClientError) {
  if (error.status === 401) {
    if (typeof window !== "undefined") {
      const refreshed = await appSession.refreshAccessToken();
      if (refreshed) {
        return;
      }

      appSession.clearSession();
      appSession.redirectToLogin();
    }
    return;
  }

  const errorCode = extractErrorCode(error.data);
  const redirectPath =
    error.status === 403 ? getRedirectPathForForbiddenCode(errorCode) : null;

  if (redirectPath && typeof window !== "undefined") {
    window.location.assign(redirectPath);
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
