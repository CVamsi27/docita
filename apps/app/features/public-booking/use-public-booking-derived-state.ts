"use client";

import { usePublicBookingFieldValidations } from "@/features/public-booking/use-public-booking-field-validations";
import { usePublicBookingReadinessState } from "@/features/public-booking/use-public-booking-readiness-state";

interface DerivedStateParams {
  siteKey: string | undefined;
  turnstileToken: string | null;
  phone: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
  requiresOtp: boolean | null;
  verificationToken: string | null;
  slotDate: string;
  submitFieldErrors: Record<string, string>;
}

export function usePublicBookingDerivedState(params: DerivedStateParams) {
  const validations = usePublicBookingFieldValidations(params.submitFieldErrors);
  const readiness = usePublicBookingReadinessState(params);

  return { ...validations, ...readiness };
}
