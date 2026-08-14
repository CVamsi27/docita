import { sanitizeUserFacingMessage } from "@workspace/utils";
import { showUserFacingErrorToast } from "@workspace/ui/components/feedback/user-facing-error-toast";

export { showUserFacingErrorToast };

export function getSafeUserMessage(
  message: string | null | undefined,
  fallback = "Please review the information on this screen and try again",
): string {
  return sanitizeUserFacingMessage(message, fallback);
}
