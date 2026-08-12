import { ApiError } from "@/lib/errors";

/**
 * Maps RFC7807 `detail` strings from public booking (Nest BadRequest / Unauthorized)
 * to synthetic field keys used by the anonymous booking UI.
 */
const PUBLIC_BOOKING_DETAIL_FIELD_MESSAGES: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "preferredDoctorId is required when selecting a time slot": {
    preferredDoctorId:
      "Choose a doctor for this time, or clear the time and request a date only.",
  },
  "Selected slot is no longer available": {
    requestedSlotStart:
      "That time is no longer available. Choose another open slot.",
    requestedSlotEnd:
      "That time is no longer available. Choose another open slot.",
  },
  "Invalid requested slot": {
    requestedSlotStart:
      "That requested time is not valid. Pick an open slot again.",
    requestedSlotEnd:
      "That requested time is not valid. Pick an open slot again.",
  },
  "Unexpected booking verification token": {
    bookingVerificationToken:
      "Verification does not apply for a new booking at this number.",
  },
  "Booking verification is required for this phone number": {
    bookingVerificationToken:
      "Verify your phone with the code sent to you before submitting.",
  },
  "Invalid booking verification": {
    bookingVerificationToken:
      "Verification does not match this phone. Request a new code and try again.",
  },
  "Date of birth is required when this phone number is not already on file at this clinic":
    {
      dateOfBirth:
        "Enter your date of birth so we can create your chart at this location.",
    },
};

export function extractProblemDetail(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.details === undefined) {
    return null;
  }

  const raw = error.details.detail;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function inferPublicBookingFieldErrorsFromDetail(
  detail: string | null | undefined,
): Record<string, string> {
  if (!detail) return {};
  const mapped = PUBLIC_BOOKING_DETAIL_FIELD_MESSAGES[detail];
  return mapped ? { ...mapped } : {};
}

export function extractApiValidationErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.details === undefined) {
    return {};
  }

  const raw = error.details.validationErrors;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim().length > 0) {
      out[key] = value;
    }
  }
  return out;
}

export function buildPublicBookingSubmitErrors(error: unknown): {
  fieldErrors: Record<string, string>;
  generalMessage: string | null;
} {
  const detail = extractProblemDetail(error);
  const inferred = inferPublicBookingFieldErrorsFromDetail(detail);
  const fromApi = extractApiValidationErrors(error);
  const fieldErrors = { ...inferred, ...fromApi };

  const generalMessage =
    Object.keys(fieldErrors).length === 0 && detail !== null ? detail : null;

  return { fieldErrors, generalMessage };
}
