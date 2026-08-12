"use client";

import { useState } from "react";
import type { PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";
import { usePublicBookingDerivedState } from "@/features/public-booking/use-public-booking-derived-state";
import { usePublicBookingSubmissionActions } from "@/features/public-booking/use-public-booking-submission-actions";
import type { PublicBookingFieldParams } from "@/features/public-booking/use-public-booking-readiness-state";

interface UsePublicBookingSubmissionStateParams
  extends PublicBookingFieldParams {
  handleSelectSlot: (start: string, end: string) => void;
  handleSelectSlotWithDoctor: (
    start: string,
    end: string,
    doctorId: string,
  ) => void;
}

export function usePublicBookingSubmissionState(
  params: UsePublicBookingSubmissionStateParams,
) {
  const [submitFieldErrors, setSubmitFieldErrors] = useState<
    Record<string, string>
  >({});
  const [submitGeneralMessage, setSubmitGeneralMessage] = useState<
    string | null
  >(null);
  const [done, setDone] = useState(false);
  const [mobileStep, setMobileStep] =
    useState<PublicBookingMobileStep>("visit");

  const derived = usePublicBookingDerivedState({
    siteKey: params.siteKey,
    turnstileToken: params.turnstileToken,
    phone: params.phone,
    firstName: params.firstName,
    lastName: params.lastName,
    dateOfBirth: params.dateOfBirth,
    dpdpConsentAccepted: params.dpdpConsentAccepted,
    requiresOtp: params.requiresOtp,
    verificationToken: params.verificationToken,
    slotDate: params.slotDate,
    submitFieldErrors,
  });

  const actions = usePublicBookingSubmissionActions(
    params.handleSelectSlot,
    params.handleSelectSlotWithDoctor,
    setSubmitFieldErrors,
    setMobileStep,
  );

  return {
    submitFieldErrors,
    setSubmitFieldErrors,
    submitGeneralMessage,
    setSubmitGeneralMessage,
    done,
    setDone,
    mobileStep,
    setMobileStep,
    ...derived,
    ...actions,
  };
}
