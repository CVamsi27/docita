import { APIRequestError, ErrorCodes } from "@workspace/data-access";
import { ApiError } from "@/lib/errors";
import { appSession } from "@/lib/auth/session";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Errors where retrying the same query from the page will not help — the
 * session is missing, expired, or the browser cannot reach the API with cookies.
 */
export function isSessionRecoveryError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.statusCode === 401 || error.code === "AUTHENTICATION_ERROR") return true;
    if (error.code === ErrorCodes.UNAUTHORIZED) return true;
    if (error.code === ErrorCodes.NETWORK_ERROR || error.code === "NETWORK_ERROR") return true;
    return false;
  }

  if (error instanceof APIRequestError) {
    if (error.status === 401 || error.code === ErrorCodes.UNAUTHORIZED) return true;
    if (error.isNetworkError || error.code === ErrorCodes.NETWORK_ERROR) return true;
    return false;
  }

  if (isRecord(error)) {
    const code = error.code;
    const status = error.status ?? error.statusCode;
    if (status === 401) return true;
    if (code === ErrorCodes.UNAUTHORIZED || code === "AUTHENTICATION_ERROR") return true;
    if (code === ErrorCodes.NETWORK_ERROR || code === "NETWORK_ERROR") return true;
  }

  return false;
}

/**
 * Attempt refresh once; otherwise clear the broken session and send the user
 * back to login with their current path preserved for return.
 */
export async function recoverSessionOrRedirectLogin(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (appSession.isPublicPath(window.location.pathname)) {
    return false;
  }

  const refreshed = await appSession.refreshAccessToken();
  if (refreshed) return true;

  appSession.clearSession();
  appSession.redirectToLogin();
  return false;
}
