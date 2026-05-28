"use client";

import { toast } from "sonner";
import { getUserFacingErrorMessage, type UserFacingErrorContext } from "@workspace/utils";

const ERROR_TOAST_DURATION_MS = 8000;

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
