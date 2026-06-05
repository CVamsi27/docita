import { isPreClinicSetupRoute } from "@/lib/auth/pre-clinic-setup-routes";
import {
  SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_SETTINGS_PATH,
} from "@/lib/subscription/subscription-settings-path";
import type { ApiClientError } from "./api-client-error-types";

const forbiddenRedirectPaths: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "/verify-email-sent",
  NO_CLINIC: "/choose-path",
  SUBSCRIPTION_INACTIVE: SUBSCRIPTION_BILLING_RESOLVE_PATH,
  SUBSCRIPTION_HARD_LOCKED: SUBSCRIPTION_BILLING_RESOLVE_PATH,
  TRIAL_EXPIRED: SUBSCRIPTION_BILLING_RESOLVE_PATH,
  INSUFFICIENT_TIER: SUBSCRIPTION_SETTINGS_PATH,
  PASSWORD_EXPIRED: "/settings?tab=security",
  INVALID_CSRF_TOKEN: "/login",
};

export function getRedirectPathForForbiddenCode(code?: string): string | null {
  return code ? (forbiddenRedirectPaths[code] ?? null) : null;
}

export function getCurrentPathname(): string | undefined {
  return typeof window !== "undefined" ? window.location?.pathname : undefined;
}

export function getApiClientRedirectPath(
  error: ApiClientError,
  errorCode: string | undefined,
  currentPathname: string | undefined,
): string | null {
  if (
    error.status !== 403 ||
    shouldSuppressCsrfLoginRedirect(errorCode, currentPathname)
  ) {
    return null;
  }
  return getRedirectPathForForbiddenCode(errorCode);
}

export function shouldSuppressForbiddenToast(
  error: ApiClientError,
  currentPathname: string | undefined,
): boolean {
  return error.status === 403 && isPreClinicSetupPath(currentPathname);
}

function shouldSuppressCsrfLoginRedirect(
  errorCode: string | undefined,
  currentPathname: string | undefined,
): boolean {
  return (
    errorCode === "INVALID_CSRF_TOKEN" && isPreClinicSetupPath(currentPathname)
  );
}

function isPreClinicSetupPath(currentPathname: string | undefined): boolean {
  return (
    typeof currentPathname === "string" &&
    isPreClinicSetupRoute(currentPathname)
  );
}
