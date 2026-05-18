import { sanitizeUserFacingMessage } from "@workspace/types";
import { ApiError } from "@/lib/errors";

/**
 * Extract a user-facing registration-field error from an ApiError thrown by the
 * doctor registration mutation. Returns null when no per-field message is
 * available — callers fall back to a generic toast.
 */
export function extractRegistrationFieldError(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;

  const validationErrors = error.details?.validationErrors;
  if (
    !validationErrors ||
    typeof validationErrors !== "object" ||
    Array.isArray(validationErrors)
  ) {
    return null;
  }

  const fieldErrors = validationErrors as Record<string, unknown>;
  const registrationFieldError = fieldErrors.registrationNumber;
  if (
    typeof registrationFieldError === "string" &&
    registrationFieldError.length > 0
  ) {
    return sanitizeUserFacingMessage(
      registrationFieldError,
      "Please check the registration number",
    );
  }

  const firstFieldError = Object.values(fieldErrors).find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (firstFieldError) {
    return sanitizeUserFacingMessage(
      firstFieldError,
      "Please check the registration number",
    );
  }

  return null;
}

export interface VerificationStep {
  label: string;
  description: string;
  done: boolean;
  required: boolean;
}

export function buildVerificationSteps(params: {
  hasSignature: boolean;
  hasRegistrationProgress: boolean;
}): VerificationStep[] {
  return [
    {
      label: "Upload Digital Signature",
      description: "Required to generate prescriptions and medical documents",
      done: params.hasSignature,
      required: true,
    },
    {
      label: "Medical Registration Number",
      description:
        "Registration number and jurisdiction details for council verification",
      done: params.hasRegistrationProgress,
      required: true,
    },
  ];
}
