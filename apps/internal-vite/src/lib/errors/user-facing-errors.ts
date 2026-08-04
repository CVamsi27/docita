import { toast } from "sonner";
import {
  getUserFacingErrorMessage,
  type UserFacingErrorContext,
} from "@workspace/utils";

/** Long enough to read; still auto-dismisses (see ToasterWrapper default duration). */
const ERROR_TOAST_DURATION_MS = 8000;
const ERROR_TOAST_DEDUPE_WINDOW_MS = 2500;
const recentErrorToasts = new Map<string, number>();

export function showUserFacingErrorToast(
  error: unknown,
  fallback = "Please review the information on this screen and try again",
  context: UserFacingErrorContext = "generic",
): void {
  const message = getUserFacingErrorMessage(error, {
    context,
    fallback,
  });
  const toastKey = `${context}:${message}`;
  const now = Date.now();
  const lastShownAt = recentErrorToasts.get(toastKey);

  if (lastShownAt && now - lastShownAt < ERROR_TOAST_DEDUPE_WINDOW_MS) {
    return;
  }

  recentErrorToasts.set(toastKey, now);

  toast.error(message, { duration: ERROR_TOAST_DURATION_MS });
}
