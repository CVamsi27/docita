"use client";

import { toast } from "sonner";
import {
  getUserFacingErrorMessage,
  sanitizeUserFacingMessage,
  type UserFacingErrorContext,
} from "@workspace/types";

export type { UserFacingErrorContext };

const ERROR_TOAST_DURATION_MS = Number.POSITIVE_INFINITY;

export function getUserFacingFormError(
  error: unknown,
  fallback = "Please check this field.",
): string {
  return getUserFacingErrorMessage(error, {
    context: "form",
    fallback,
  });
}

export function getSafeUserMessage(
  message: string | null | undefined,
  fallback = "Something went wrong. Please try again.",
): string {
  return sanitizeUserFacingMessage(message, fallback);
}

export function showUserFacingErrorToast(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
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
