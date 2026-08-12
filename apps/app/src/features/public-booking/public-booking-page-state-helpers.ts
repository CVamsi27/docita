import { PUBLIC_BOOKING_SUBMIT_FIELD_KEYS } from "@/features/public-booking/public-booking-constants";
import { getPatientFullName } from "@workspace/utils";

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
  const values = [slotStart, slotEnd].filter(isNonEmptyString);
  return values.length === 2 && values[0] !== values[1]
    ? `${values[0]} · ${values[1]}`
    : (values[0] ?? "");
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
  return [
    hasPhone(params),
    params.requiresOtp !== null,
    contactVerificationReady(params),
  ].every(Boolean);
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
// jscpd:ignore-start
  visitCanContinue: boolean;
  phone: string;
  requiresOtp: boolean | null;
  verificationToken: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
}): boolean {
  return [
    Boolean(params.slotDate?.trim()),
// jscpd:ignore-end
    params.visitCanContinue,
    hasPhone(params),
    params.requiresOtp !== null,
    contactVerificationReady(params),
  ].every(Boolean);
}

function contactVerificationReady(params: {
  requiresOtp: boolean | null;
  verificationToken: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
}): boolean {
  return params.requiresOtp === true
    ? Boolean(params.verificationToken)
    : demographicDetailsReady(params);
}

function demographicDetailsReady(params: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
}): boolean {
  const hasFirstName = Boolean(
    getPatientFullName({ firstName: params.firstName }).trim(),
  );
  const hasLastName = Boolean(
    getPatientFullName({ lastName: params.lastName }).trim(),
  );

  return [
    hasFirstName,
    hasLastName,
    Boolean(params.dateOfBirth.trim()),
    params.dpdpConsentAccepted,
  ].every(Boolean);
}

function hasPhone(params: { phone: string }): boolean {
  return Boolean(params.phone.trim());
}

function isNonEmptyString(value: string | undefined): value is string {
  return Boolean(value);
}
