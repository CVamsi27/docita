import { PUBLIC_BOOKING_SUBMIT_FIELD_KEYS } from "@/features/public-booking/public-booking-constants";

export function computeUnknownSubmitErrors(
  submitFieldErrors: Record<string, string>,
): Array<[string, string]> {
  return Object.entries(submitFieldErrors).filter(
    ([key]) => !PUBLIC_BOOKING_SUBMIT_FIELD_KEYS.has(key),
  );
}

export function computeSlotRangeSubmitError(
  slotStart: string | undefined,
  slotEnd: string | undefined,
): string {
  if (slotStart && slotEnd && slotStart !== slotEnd)
    return `${slotStart} \u00B7 ${slotEnd}`;
  return slotStart ?? slotEnd ?? "";
}

export function clearSlotErrors(
  prev: Record<string, string>,
): Record<string, string> {
  const next = { ...prev };
  delete next.requestedSlotStart;
  delete next.requestedSlotEnd;
  return next;
}

export function computeVisitCanContinue(
  siteKey: string | undefined,
  turnstileToken: string | null | undefined,
): boolean {
  return !siteKey || Boolean(turnstileToken);
}

export function computeContactCanContinue(params: {
  phone: string;
  requiresOtp: boolean | null;
  verificationToken: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
}): boolean {
  return (
    Boolean(params.phone.trim()) &&
    params.requiresOtp !== null &&
    (params.requiresOtp !== true || Boolean(params.verificationToken)) &&
    (params.requiresOtp === true ||
      (Boolean(params.firstName.trim()) &&
        Boolean(params.lastName.trim()) &&
        Boolean(params.dateOfBirth.trim()) &&
        params.dpdpConsentAccepted))
  );
}

export function clearDateOfBirthError(
  prev: Record<string, string>,
): Record<string, string> {
  const next = { ...prev };
  delete next.dateOfBirth;
  return next;
}

export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: "auto" });
}

export function focusAndScrollToField(fieldId: string, delayMs = 120): void {
  window.setTimeout(() => {
    const el = document.getElementById(fieldId);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, delayMs);
}

export function parseIsoDateToLocalDate(isoDate: string): Date {
  return new Date(isoDate + "T00:00:00");
}

export function computeSubmitRequestReady(params: {
  slotDate: string | undefined;
  visitCanContinue: boolean;
  phone: string;
  requiresOtp: boolean | null;
  verificationToken: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
}): boolean {
  if (!params.slotDate?.trim()) return false;
  if (!params.visitCanContinue) return false;
  if (!params.phone.trim()) return false;
  if (params.requiresOtp === null) return false;
  if (params.requiresOtp === true) {
    if (!params.verificationToken) return false;
  } else {
    if (!params.firstName.trim() || !params.lastName.trim() || !params.dateOfBirth.trim()) {
      return false;
    }
    if (!params.dpdpConsentAccepted) return false;
  }
  return true;
}
