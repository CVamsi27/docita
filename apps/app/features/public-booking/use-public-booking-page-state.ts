"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePublicBookingContext } from "@workspace/data-access";
import {
  type PublicBookingMobileStep,
  PUBLIC_BOOKING_SUBMIT_FIELD_KEYS,
} from "@/features/public-booking/public-booking-constants";
import { usePublicBookingSubmitActions } from "@/features/public-booking/hooks/use-public-booking-submit-actions";
import { usePublicBookingSlotState } from "@/features/public-booking/use-public-booking-slot-state";

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
    () =>
      Object.entries(submitFieldErrors).filter(
        ([key]) => !PUBLIC_BOOKING_SUBMIT_FIELD_KEYS.has(key),
      ),
    [submitFieldErrors],
  );

  const slotRangeSubmitError = useMemo(() => {
    const start = submitFieldErrors.requestedSlotStart;
    const end = submitFieldErrors.requestedSlotEnd;
    if (start && end && start !== end) return `${start} · ${end}`;
    return start ?? end ?? "";
  }, [
    submitFieldErrors.requestedSlotEnd,
    submitFieldErrors.requestedSlotStart,
  ]);

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
    () => !siteKey || Boolean(turnstileToken),
    [siteKey, turnstileToken],
  );

  const contactCanContinue = useMemo(
    () =>
      Boolean(phone.trim()) &&
      requiresOtp !== null &&
      (requiresOtp !== true || Boolean(verificationToken)) &&
      (requiresOtp === true ||
        (Boolean(firstName.trim()) &&
          Boolean(lastName.trim()) &&
          Boolean(dateOfBirth.trim()) &&
          dpdpConsentAccepted)),
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

  const submitRequestReady = useMemo(() => {
    if (!slots.slotDate?.trim()) return false;
    if (!visitCanContinue) return false;
    if (!phone.trim()) return false;
    if (requiresOtp === null) return false;
    if (requiresOtp === true) {
      if (!verificationToken) return false;
    } else {
      if (!firstName.trim() || !lastName.trim() || !dateOfBirth.trim()) {
        return false;
      }
      if (!dpdpConsentAccepted) return false;
    }
    return true;
  }, [
    slots.slotDate,
    visitCanContinue,
    phone,
    requiresOtp,
    verificationToken,
    firstName,
    lastName,
    dateOfBirth,
    dpdpConsentAccepted,
  ]);

  const goToStep = useCallback(
    (step: PublicBookingMobileStep, focusFieldId?: string) => {
      setMobileStep(step);
      if (focusFieldId) {
        window.setTimeout(() => {
          const el = document.getElementById(focusFieldId);
          el?.focus({ preventScroll: true });
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 120);
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    [],
  );

  useEffect(() => {
    if (requiresOtp === true) {
      setDateOfBirth("");
      setDpdpConsentAccepted(false);
      setSubmitFieldErrors((prev) => {
        const next = { ...prev };
        delete next.dateOfBirth;
        return next;
      });
    }
  }, [requiresOtp]);

  const handleSelectSlot = useCallback(
    (startIso: string, endIso: string) => {
      slots.handleSelectSlot(startIso, endIso);
      setSubmitFieldErrors((prev) => {
        const next = { ...prev };
        delete next.requestedSlotStart;
        delete next.requestedSlotEnd;
        return next;
      });
    },
    [slots],
  );

  const handleSelectSlotWithDoctor = useCallback(
    (startIso: string, endIso: string, slotDoctorId: string) => {
      slots.handleSelectSlotWithDoctor(startIso, endIso, slotDoctorId);
      setSubmitFieldErrors((prev) => {
        const next = { ...prev };
        delete next.requestedSlotStart;
        delete next.requestedSlotEnd;
        return next;
      });
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
