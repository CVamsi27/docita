import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { extractRegistrationFieldError } from "@/features/setup/components/verify-doctor/helpers";
import type { RegistrationInputState } from "./use-verify-doctor-types";

export function handleRegistrationSaveError(
  error: unknown,
  input: RegistrationInputState,
): boolean {
  const fieldError = extractRegistrationFieldError(error);
  if (fieldError) {
    input.setRegistrationError(fieldError);
    showUserFacingErrorToast(undefined, fieldError, "form");
    return false;
  }
  showUserFacingErrorToast(
    error,
    "We could not save this registration number. Please try again.",
    "save",
  );
  return false;
}
