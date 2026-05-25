import { sanitizeUserFacingMessage } from "../errors/user-facing-errors.js";

export type DoctorVerificationStatusValue =
  | "UNVERIFIED"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "FAILED";

function statusFallbackMessage(
  status: DoctorVerificationStatusValue | undefined,
): string {
  switch (status) {
    case "FAILED":
      return "Registration verification could not be completed. Try again later or contact support.";
    case "REJECTED":
      return "Registration could not be verified. Check the registration details or contact support.";
    case "UNVERIFIED":
      return "Registration has not been verified yet.";
    case "PENDING":
      return "Verification is in progress.";
    default:
      return "Verification could not be completed. Try again later.";
  }
}

export function getDoctorVerificationPublicNote(
  status: DoctorVerificationStatusValue | undefined,
  rawReason?: string | null,
): string | null {
  const fallback = statusFallbackMessage(status);
  const trimmed = rawReason?.trim();
  if (!trimmed) {
    if (!status || status === "VERIFIED") return null;
    if (status === "PENDING") return null;
    return fallback;
  }

  const message = sanitizeUserFacingMessage(trimmed, fallback);
  if (status === "VERIFIED") return null;
  return message;
}
