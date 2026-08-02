// jscpd:ignore-start
import { getPatientFullName } from "@workspace/utils";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { ANY_DOCTOR_ID } from "@/features/public-booking/public-booking-constants";
import { buildPublicBookingSubmitErrors } from "@/lib/utils/api-validation-errors";

export interface BookingValidationState {
  slotDate: string;
  phone: string;
  requiresOtp: boolean | null;
  verificationToken: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
}

export function validateBookingFields(
  state: BookingValidationState,
): string | null {
  if (!state.slotDate) return "Choose a date for your appointment request.";
  if (!state.phone.trim()) {
    return "Enter your phone number before submitting.";
  }
  if (state.requiresOtp === null) return null;
  if (state.requiresOtp === true && !state.verificationToken) return "Verify your phone with the code we sent before submitting.";
  if (
    state.requiresOtp === false &&
    (!state.firstName.trim() || !state.lastName.trim() || !state.dateOfBirth.trim())
  ) {
    return "Enter your name and date of birth before submitting.";
  }
  if (state.requiresOtp === false && !state.dpdpConsentAccepted) return "Please accept the data processing notice (DPDP Act, 2023) before submitting.";
  return null;
}

export interface BookingBodyInput {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  doctorId: string;
  selectedSlotDoctorId: string | null;
  slotDate: string;
  selectedStart: string | null;
  selectedEnd: string | null;
  reason: string;
  notes: string;
// jscpd:ignore-end
  turnstileToken: string | null;
  verificationToken: string | null;
  requiresOtp: boolean | null;
  dpdpConsentAccepted: boolean;
  otpRequired: boolean;
}

export function buildBookingRequestBody(input: BookingBodyInput) {
  const resolvedDoctorId =
    input.doctorId === ANY_DOCTOR_ID
      ? input.selectedSlotDoctorId
      : input.doctorId || null;
  const includeSlot = Boolean(input.selectedStart && input.selectedEnd);

  return {
    body: {
      phoneNumber: input.phone,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      dateOfBirth: input.otpRequired
        ? undefined
        : input.dateOfBirth.trim() || undefined,
      email: input.email.trim() || undefined,
      preferredDoctorId: resolvedDoctorId ?? undefined,
      slotCalendarDate: input.slotDate,
      requestedSlotStart: includeSlot
        ? (input.selectedStart ?? undefined)
        : undefined,
      requestedSlotEnd: includeSlot
        ? (input.selectedEnd ?? undefined)
        : undefined,
      reason: input.reason.trim() || undefined,
      notes: input.notes.trim() || undefined,
      turnstileToken: input.turnstileToken ?? undefined,
      bookingVerificationToken: input.verificationToken ?? undefined,
      dpdpConsent: input.otpRequired
        ? undefined
        : {
            accepted: true,
            noticeVersion: DPDP_NOTICE_VERSION,
            relation: "SELF",
            givenByName: getPatientFullName({
              firstName: input.firstName,
              lastName: input.lastName,
            }),
          },
    },
    authorization: input.verificationToken ?? undefined,
  } as const;
}

export function processPublicBookingSubmitError(
  error: unknown,
  siteKey: string | undefined,
): { fieldErrors: Record<string, string>; generalMessage: string | null } {
  const built = buildPublicBookingSubmitErrors(error);
  let { fieldErrors, generalMessage } = built;

  if (fieldErrors.turnstileToken && !siteKey) {
    generalMessage = generalMessage ?? fieldErrors.turnstileToken;
    const next = { ...fieldErrors };
    delete next.turnstileToken;
    fieldErrors = next;
  }

  return { fieldErrors, generalMessage };
}
