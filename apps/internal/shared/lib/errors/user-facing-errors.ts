"use client";

import { toast } from "sonner";
import { getUserFacingErrorMessage, sanitizeUserFacingMessage, type UserFacingErrorContext } from "@workspace/utils";

const ERROR_TOAST_DURATION_MS = 8000;

export function getSafeUserMessage(
  message: string | null | undefined,
  fallback = "Please review the information on this screen and try again",
): string {
  return sanitizeUserFacingMessage(message, fallback);
}

export function showUserFacingErrorToast(
  error: unknown,
  fallback = "Please review the information on this screen and try again",
  context: UserFacingErrorContext = "generic",
): void {
  toast.error(
    getUserFacingErrorMessage(error, {
      context,
      fallback,
    }),
    { duration: ERROR_TOAST_DURATION_MS },
  );
}
