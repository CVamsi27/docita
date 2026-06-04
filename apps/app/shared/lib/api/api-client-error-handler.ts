import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  isApiAvailabilityError,
  markApiUnavailable,
} from "@/lib/api/api-availability";
import { extractErrorCode } from "./api-client-error-code";
import {
  getApiClientRedirectPath,
  getCurrentPathname,
  shouldSuppressForbiddenToast,
} from "./api-client-error-routing";
import {
  apiErrorToastCategory,
  apiErrorToastFallback,
  shouldSuppressDevToast,
} from "./api-client-error-toast";
import type { ApiClientError } from "./api-client-error-types";

export type { ApiClientError } from "./api-client-error-types";
export { getRedirectPathForForbiddenCode } from "./api-client-error-routing";

export async function handleApiClientError(
  error: ApiClientError,
): Promise<void> {
  if (isApiAvailabilityError(error)) {
    markApiUnavailable();
    return;
  }
  if (shouldIgnoreApiClientError(error)) return;

  const errorCode = extractErrorCode(error);
  const currentPathname = getCurrentPathname();
  const redirectPath = getApiClientRedirectPath(
    error,
    errorCode,
    currentPathname,
  );
  if (redirectPath && typeof window !== "undefined") {
    window.location.assign(redirectPath);
    return;
  }
  if (shouldSuppressForbiddenToast(error, currentPathname)) return;
  if (shouldSuppressDevToast(error.message || "")) return;

  showUserFacingErrorToast(
    error,
    apiErrorToastFallback(error),
    apiErrorToastCategory(error),
  );
}

function shouldIgnoreApiClientError(error: ApiClientError): boolean {
  return error.status === 401 || error.isNetworkError === true;
}
