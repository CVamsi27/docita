"use client";

import { useMemo } from "react";
import {
  computeVisitCanContinue,
  computeContactCanContinue,
  computeSubmitRequestReady,
} from "@/features/public-booking/public-booking-page-state-helpers";

/**
 * Patient-identity + verification fields shared by every public-booking
 * state hook (`usePublicBookingReadinessState`, `usePublicBookingDerivedState`,
 * `usePublicBookingSubmissionState`) — they all derive their readiness/
 * validation/submission checks from the same visitor inputs, differing only
 * in what extra state (submit errors, slot-selection handlers, …) they layer
 * on top.
 */
export interface PublicBookingFieldParams {
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
}

export function usePublicBookingReadinessState(
  params: PublicBookingFieldParams,
) {
  const visitCanContinue = useMemo(
    () => computeVisitCanContinue(params.siteKey, params.turnstileToken),
    [params.siteKey, params.turnstileToken],
  );

  const contactCanContinue = computeContactCanContinue({
    phone: params.phone,
    requiresOtp: params.requiresOtp,
    verificationToken: params.verificationToken,
    firstName: params.firstName,
    dateOfBirth: params.dateOfBirth,
    lastName: params.lastName,
    dpdpConsentAccepted: params.dpdpConsentAccepted,
  });

  const submitRequestReady = computeSubmitRequestReady({
    slotDate: params.slotDate,
    visitCanContinue,
    phone: params.phone,
    requiresOtp: params.requiresOtp,
    verificationToken: params.verificationToken,
    firstName: params.firstName,
    dateOfBirth: params.dateOfBirth,
    lastName: params.lastName,
    dpdpConsentAccepted: params.dpdpConsentAccepted,
  });

  return { visitCanContinue, contactCanContinue, submitRequestReady };
}
