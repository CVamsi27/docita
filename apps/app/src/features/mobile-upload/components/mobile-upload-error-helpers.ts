import { APIRequestError } from "@workspace/data-access";

interface UploadErrorPresentation {
  /** User-facing message shown both inline and in the toast. */
  message: string;
  /** Value to hand `showUserFacingErrorToast` as the error — `null` for
   * expected, already-explained statuses so they aren't reported as bugs. */
  reportable: unknown;
}

const EXPECTED_STATUS_MESSAGES: Record<number, string> = {
  413: "File is too large. Please use a smaller image.",
  404: "Session expired. Please scan the QR code again.",
  401: "This upload link is invalid or incomplete. Please scan the QR code again.",
  400: "Please upload an image file",
};

const GENERIC_UPLOAD_ERROR_MESSAGE =
  "We could not upload this image. Please try again.";

/**
 * Maps a failed mobile-upload attempt to the message and "reportable" value
 * the page should surface — expected API statuses (link/file problems) get a
 * specific, non-reported message; anything else falls back to a generic
 * message that's still reported via `showUserFacingErrorToast`.
 */
export function resolveUploadErrorPresentation(
  error: unknown,
): UploadErrorPresentation {
  if (error instanceof APIRequestError && error.status !== undefined) {
    const expectedMessage = EXPECTED_STATUS_MESSAGES[error.status];
    if (expectedMessage) {
      return { message: expectedMessage, reportable: null };
    }
  }

  return { message: GENERIC_UPLOAD_ERROR_MESSAGE, reportable: error };
}
