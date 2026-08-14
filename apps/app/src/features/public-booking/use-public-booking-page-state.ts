"use client";

import { useEffect } from "react";
import { usePublicBookingContext } from "@workspace/data-access";
import { usePublicBookingSubmitActions } from "@/features/public-booking/hooks/use-public-booking-submit-actions";
import { usePublicBookingSlotState } from "@/features/public-booking/use-public-booking-slot-state";
import { usePublicBookingFormFields } from "@/features/public-booking/use-public-booking-form-fields";
import { usePublicBookingVerification } from "@/features/public-booking/use-public-booking-form-verification";
import { usePublicBookingSubmissionState } from "@/features/public-booking/use-public-booking-submission-state";
import { clearDateOfBirthError } from "@/features/public-booking/public-booking-page-state-helpers";

export function usePublicBookingPageState(referralCode: string) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const slots = usePublicBookingSlotState(referralCode);
  const f = usePublicBookingFormFields(siteKey);
  const v = usePublicBookingVerification(
    f.setDateOfBirth,
    f.setDpdpConsentAccepted,
  );
  const s = usePublicBookingSubmissionState({
    siteKey,
    turnstileToken: f.turnstileToken,
    phone: f.phone,
    firstName: f.firstName,
    lastName: f.lastName,
    dateOfBirth: f.dateOfBirth,
    dpdpConsentAccepted: f.dpdpConsentAccepted,
    requiresOtp: v.requiresOtp,
    verificationToken: v.verificationToken,
    slotDate: slots.slotDate,
    handleSelectSlot: slots.handleSelectSlot,
    handleSelectSlotWithDoctor: slots.handleSelectSlotWithDoctor,
  });
  const { setSubmitFieldErrors } = s;
  useEffect(() => {
    if (v.requiresOtp === true) setSubmitFieldErrors(clearDateOfBirthError);
  }, [v.requiresOtp, setSubmitFieldErrors]);
  const contextQuery = usePublicBookingContext(
    referralCode,
    v.verificationToken,
  );
  const a = usePublicBookingSubmitActions(referralCode, {
    phone: f.phone,
    otp: v.otp,
    turnstileToken: f.turnstileToken,
    siteKey,
    requiresOtp: v.requiresOtp,
    setRequiresOtp: v.setRequiresOtp,
    verificationToken: v.verificationToken,
    setVerificationToken: v.setVerificationToken,
    firstName: f.firstName,
    setFirstName: f.setFirstName,
    lastName: f.lastName,
    setLastName: f.setLastName,
    email: f.email,
    setEmail: f.setEmail,
    dateOfBirth: f.dateOfBirth,
    dpdpConsentAccepted: f.dpdpConsentAccepted,
    reason: f.reason,
    notes: f.notes,
    slotDate: slots.slotDate,
    doctorId: slots.doctorId,
    selectedStart: slots.selectedStart,
    selectedEnd: slots.selectedEnd,
    selectedSlotDoctorId: slots.selectedSlotDoctorId,
    setSubmitFieldErrors: s.setSubmitFieldErrors,
    setSubmitGeneralMessage: s.setSubmitGeneralMessage,
    setDone: s.setDone,
  });
  return {
    referralCode,
    siteKey,
    turnstileToken: f.turnstileToken,
    setTurnstileToken: f.setTurnstileToken,
    ...slots,
    contextQuery,
    ...a,
    firstName: f.firstName,
    setFirstName: f.setFirstName,
    lastName: f.lastName,
    setLastName: f.setLastName,
    phone: f.phone,
    setPhone: f.setPhone,
    email: f.email,
    setEmail: f.setEmail,
    dateOfBirth: f.dateOfBirth,
    setDateOfBirth: f.setDateOfBirth,
    reason: f.reason,
    setReason: f.setReason,
    notes: f.notes,
    setNotes: f.setNotes,
    requiresOtp: v.requiresOtp,
    setRequiresOtp: v.setRequiresOtp,
    otp: v.otp,
    setOtp: v.setOtp,
    verificationToken: v.verificationToken,
    setVerificationToken: v.setVerificationToken,
    submitFieldErrors: s.submitFieldErrors,
    setSubmitFieldErrors: s.setSubmitFieldErrors,
    submitGeneralMessage: s.submitGeneralMessage,
    done: s.done,
    setDone: s.setDone,
    unknownSubmitErrors: s.unknownSubmitErrors,
    slotRangeSubmitError: s.slotRangeSubmitError,
    handleSelectSlot: s.handleSelectSlot,
    handleSelectSlotWithDoctor: s.handleSelectSlotWithDoctor,
    mobileStep: s.mobileStep,
    setMobileStep: s.setMobileStep,
    goToStep: s.goToStep,
    visitCanContinue: s.visitCanContinue,
    contactCanContinue: s.contactCanContinue,
    submitRequestReady: s.submitRequestReady,
    dpdpConsentAccepted: f.dpdpConsentAccepted,
    setDpdpConsentAccepted: f.setDpdpConsentAccepted,
  };
}

export type PublicBookingPageController = ReturnType<
  typeof usePublicBookingPageState
>;
