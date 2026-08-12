import { toast } from "sonner";
import {
  getUserFacingErrorMessage,
  type UserFacingErrorContext,
} from "@workspace/utils";

/** Long enough to read; still auto-dismisses (see ToasterWrapper default duration). */
const ERROR_TOAST_DURATION_MS = 8000;
const ERROR_TOAST_DEDUPE_WINDOW_MS = 2500;
const recentErrorToasts = new Map<string, number>();

/**
 * Drop dedupe entries whose window has elapsed, so the map stays bounded to
 * (at most) the distinct errors raised within the current dedupe window.
 */
function pruneExpiredToasts(now: number): void {
  for (const [key, shownAt] of recentErrorToasts) {
    if (now - shownAt >= ERROR_TOAST_DEDUPE_WINDOW_MS) {
      recentErrorToasts.delete(key);
    }
  }
}

/**
 * Toast a user-facing error message derived from an unknown error, deduped
 * within a short window so a burst of identical failures (e.g. a polling
 * retry) does not spam the clinician.
 */
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
  pruneExpiredToasts(now);
  const lastShownAt = recentErrorToasts.get(toastKey);

  if (lastShownAt && now - lastShownAt < ERROR_TOAST_DEDUPE_WINDOW_MS) {
    return;
  }

  recentErrorToasts.set(toastKey, now);

  toast.error(message, { duration: ERROR_TOAST_DURATION_MS });
}
