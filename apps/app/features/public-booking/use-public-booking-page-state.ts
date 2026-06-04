"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicBookingContext } from "@workspace/data-access";
import { type PublicBookingMobileStep } from "@/features/public-booking/public-booking-constants";
import { usePublicBookingSubmitActions } from "@/features/public-booking/hooks/use-public-booking-submit-actions";
import { usePublicBookingSlotState } from "@/features/public-booking/use-public-booking-slot-state";
import {
  clearDateOfBirthError,
  clearSlotErrors,
  computeContactCanContinue,
  computeSlotRangeSubmitError,
  computeSubmitRequestReady,
  computeUnknownSubmitErrors,
  computeVisitCanContinue,
  focusAndScrollToField,
  scrollToTop,
} from "@/features/public-booking/public-booking-page-state-helpers";

export function usePublicBookingPageState(referralCode: string) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const slots = usePublicBookingSlotState(referralCode);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [requiresOtp, setRequiresOtp] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null,
  );
  const [dpdpConsentAccepted, setDpdpConsentAccepted] = useState(false);

  const [submitFieldErrors, setSubmitFieldErrors] = useState<
    Record<string, string>
  >({});
  const [submitGeneralMessage, setSubmitGeneralMessage] = useState<
    string | null
  >(null);
  const [done, setDone] = useState(false);
  const [mobileStep, setMobileStep] =
    useState<PublicBookingMobileStep>("visit");

  const unknownSubmitErrors = useMemo(
    () => computeUnknownSubmitErrors(submitFieldErrors),
    [submitFieldErrors],
  );

  const slotStart = submitFieldErrors.requestedSlotStart;
  const slotEnd = submitFieldErrors.requestedSlotEnd;
  const slotRangeSubmitError = useMemo(
    () => computeSlotRangeSubmitError(slotStart, slotEnd),
    [slotStart, slotEnd],
  );

  const contextQuery = usePublicBookingContext(referralCode, verificationToken);

  const {
    phoneCheck,
    otpRequest,
    otpVerify,
    submit,
    runPhoneCheck,
    handleRequestOtp,
    handleVerifyOtp,
    handleSubmit,
  } = usePublicBookingSubmitActions(referralCode, {
    phone,
    otp,
    turnstileToken,
    siteKey,
    requiresOtp,
    setRequiresOtp,
    verificationToken,
    setVerificationToken,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    dateOfBirth,
    dpdpConsentAccepted,
    reason,
    notes,
    slotDate: slots.slotDate,
    doctorId: slots.doctorId,
    selectedStart: slots.selectedStart,
    selectedEnd: slots.selectedEnd,
    selectedSlotDoctorId: slots.selectedSlotDoctorId,
    setSubmitFieldErrors,
    setSubmitGeneralMessage,
    setDone,
  });

  const visitCanContinue = useMemo(
    () => computeVisitCanContinue(siteKey, turnstileToken),
    [siteKey, turnstileToken],
  );

  const contactCanContinue = useMemo(
    () =>
      computeContactCanContinue({
        phone,
        requiresOtp,
        verificationToken,
        firstName,
        lastName,
        dateOfBirth,
        dpdpConsentAccepted,
      }),
    [
      dateOfBirth,
      dpdpConsentAccepted,
      firstName,
      lastName,
      phone,
      requiresOtp,
      verificationToken,
    ],
  );

  const submitRequestReady = useMemo(
    () =>
      computeSubmitRequestReady({
        slotDate: slots.slotDate,
        visitCanContinue,
        phone,
        requiresOtp,
        verificationToken,
        firstName,
        lastName,
        dateOfBirth,
        dpdpConsentAccepted,
      }),
    [
      slots.slotDate,
      visitCanContinue,
      phone,
      requiresOtp,
      verificationToken,
      firstName,
      lastName,
      dateOfBirth,
      dpdpConsentAccepted,
    ],
  );

  const goToStep = useCallback(
    (step: PublicBookingMobileStep, focusFieldId?: string) => {
      setMobileStep(step);
      if (focusFieldId) {
        focusAndScrollToField(focusFieldId);
      } else {
        scrollToTop();
      }
    },
    [],
  );

  useEffect(() => {
    if (requiresOtp === true) {
      setDateOfBirth("");
      setDpdpConsentAccepted(false);
      setSubmitFieldErrors(clearDateOfBirthError);
    }
  }, [requiresOtp]);

  const handleSelectSlot = useCallback(
    (startIso: string, endIso: string) => {
      slots.handleSelectSlot(startIso, endIso);
      setSubmitFieldErrors(clearSlotErrors);
    },
    [slots],
  );

  const handleSelectSlotWithDoctor = useCallback(
    (startIso: string, endIso: string, slotDoctorId: string) => {
      slots.handleSelectSlotWithDoctor(startIso, endIso, slotDoctorId);
      setSubmitFieldErrors(clearSlotErrors);
    },
    [slots],
  );

  return {
    referralCode,
    siteKey,
    turnstileToken,
    setTurnstileToken,
    ...slots,
    contextQuery,
    phoneCheck,
    otpRequest,
    otpVerify,
    submit,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    phone,
    setPhone,
    email,
    setEmail,
    dateOfBirth,
    setDateOfBirth,
    reason,
    setReason,
    notes,
    setNotes,
    requiresOtp,
    setRequiresOtp,
    otp,
    setOtp,
    verificationToken,
    setVerificationToken,
    submitFieldErrors,
    setSubmitFieldErrors,
    submitGeneralMessage,
    done,
    setDone,
    unknownSubmitErrors,
    slotRangeSubmitError,
    handleSelectSlot,
    handleSelectSlotWithDoctor,
    runPhoneCheck,
    handleRequestOtp,
    handleVerifyOtp,
    handleSubmit,
    mobileStep,
    setMobileStep,
    goToStep,
    visitCanContinue,
    contactCanContinue,
    submitRequestReady,
    dpdpConsentAccepted,
    setDpdpConsentAccepted,
  };
}

export type PublicBookingPageController = ReturnType<
  typeof usePublicBookingPageState
>;
