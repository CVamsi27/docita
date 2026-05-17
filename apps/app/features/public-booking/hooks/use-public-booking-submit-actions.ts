"use client";

import { useCallback } from "react";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import {
  usePublicBookingOtpRequest,
  usePublicBookingOtpVerify,
  usePublicBookingPhoneCheck,
  usePublicBookingSubmit,
} from "@/hooks/api/use-public-booking";
import { ApiError } from "@/lib/errors";
import { buildPublicBookingSubmitErrors } from "@/lib/utils/api-validation-errors";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import { ANY_DOCTOR_ID } from "@/features/public-booking/public-booking-constants";

interface SubmitActionsState {
  phone: string;
  otp: string;
  turnstileToken: string | null;
  siteKey: string | undefined;
  requiresOtp: boolean | null;
  setRequiresOtp: (v: boolean | null) => void;
  verificationToken: string | null;
  setVerificationToken: (v: string | null) => void;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  dateOfBirth: string;
  dpdpConsentAccepted: boolean;
  reason: string;
  notes: string;
  slotDate: string;
  doctorId: string;
  selectedStart: string | null;
  selectedEnd: string | null;
  selectedSlotDoctorId: string | null;
  setSubmitFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSubmitGeneralMessage: (v: string | null) => void;
  setDone: (v: boolean) => void;
}

export function usePublicBookingSubmitActions(
  referralCode: string,
  state: SubmitActionsState,
) {
  const phoneCheck = usePublicBookingPhoneCheck(referralCode);
  const otpRequest = usePublicBookingOtpRequest(referralCode);
  const otpVerify = usePublicBookingOtpVerify(referralCode);
  const submit = usePublicBookingSubmit(referralCode);

  const {
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
    slotDate,
    doctorId,
    selectedStart,
    selectedEnd,
    selectedSlotDoctorId,
    setSubmitFieldErrors,
    setSubmitGeneralMessage,
    setDone,
  } = state;

  const runPhoneCheck = useCallback(async () => {
    try {
      const res = await phoneCheck.mutateAsync({
        phoneNumber: phone,
        turnstileToken: turnstileToken ?? undefined,
      });
      setRequiresOtp(res.requiresOtp);
      return res;
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not verify this phone number. Please try again.",
        "generic",
      );
      throw error;
    }
  }, [phone, phoneCheck, turnstileToken, setRequiresOtp]);

  const handleRequestOtp = useCallback(async () => {
    try {
      await runPhoneCheck();
      await otpRequest.mutateAsync({
        phoneNumber: phone,
        turnstileToken: turnstileToken ?? undefined,
      });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "We could not send a verification code. Please try again.",
        "generic",
      );
    }
  }, [otpRequest, phone, runPhoneCheck, turnstileToken]);

  const handleVerifyOtp = useCallback(async () => {
    try {
      const res = await otpVerify.mutateAsync({ phoneNumber: phone, otp });
      setVerificationToken(res.bookingVerificationToken);
      setFirstName(res.patient.firstName);
      setLastName(res.patient.lastName);
      if (res.patient.email) setEmail(res.patient.email);
      setSubmitFieldErrors((prev) => {
        const next = { ...prev };
        delete next.bookingVerificationToken;
        return next;
      });
    } catch (error) {
      showUserFacingErrorToast(
        error,
        "That code did not work. Please try again.",
        "generic",
      );
    }
  }, [otp, otpVerify, phone, setVerificationToken, setFirstName, setLastName, setEmail, setSubmitFieldErrors]);

  const handleSubmit = useCallback(async () => {
    setSubmitFieldErrors({});
    setSubmitGeneralMessage(null);

    if (!slotDate) {
      showUserFacingErrorToast(null, "Choose a date for your appointment request.", "generic");
      return;
    }
    if (!phone.trim()) {
      showUserFacingErrorToast(null, "Enter your phone number before submitting.", "generic");
      return;
    }

    try {
      let otpRequired = requiresOtp;
      if (otpRequired === null) {
        const check = await runPhoneCheck();
        otpRequired = check.requiresOtp;
      }
      if (otpRequired && !verificationToken) {
        showUserFacingErrorToast(null, "Verify your phone with the code we sent before submitting.", "generic");
        return;
      }
      if (!otpRequired && (!firstName.trim() || !lastName.trim() || !dateOfBirth.trim())) {
        showUserFacingErrorToast(null, "Enter your name and date of birth before submitting.", "generic");
        return;
      }
      if (!otpRequired && !dpdpConsentAccepted) {
        showUserFacingErrorToast(null, "Please accept the data processing notice (DPDP Act, 2023) before submitting.", "generic");
        return;
      }

      const resolvedDoctorId =
        doctorId === ANY_DOCTOR_ID ? selectedSlotDoctorId : doctorId || null;
      const includeSlot = Boolean(selectedStart && selectedEnd);

      await submit.mutateAsync({
        body: {
          phoneNumber: phone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: otpRequired ? undefined : dateOfBirth.trim() || undefined,
          email: email.trim() || undefined,
          preferredDoctorId: resolvedDoctorId ?? undefined,
          slotCalendarDate: slotDate,
          requestedSlotStart: includeSlot ? selectedStart ?? undefined : undefined,
          requestedSlotEnd: includeSlot ? selectedEnd ?? undefined : undefined,
          reason: reason.trim() || undefined,
          notes: notes.trim() || undefined,
          turnstileToken: turnstileToken ?? undefined,
          bookingVerificationToken: verificationToken ?? undefined,
          dpdpConsent: otpRequired
            ? undefined
            : {
                accepted: true,
                noticeVersion: DPDP_NOTICE_VERSION,
                relation: "SELF",
                givenByName: `${firstName.trim()} ${lastName.trim()}`.trim(),
              },
        },
        authorization: verificationToken ?? undefined,
      });
      setDone(true);
    } catch (error) {
      const built = buildPublicBookingSubmitErrors(error);
      let fieldErrors = built.fieldErrors;
      let generalMessage = built.generalMessage;

      if (fieldErrors.turnstileToken && !siteKey) {
        generalMessage = generalMessage ?? fieldErrors.turnstileToken;
        const next = { ...fieldErrors };
        delete next.turnstileToken;
        fieldErrors = next;
      }

      setSubmitFieldErrors(fieldErrors);
      setSubmitGeneralMessage(generalMessage);

      const hasFieldHints = Object.keys(fieldErrors).length > 0;
      if (hasFieldHints) {
        showUserFacingErrorToast(null, "Review the fields marked below and try again.", "form");
      } else if (generalMessage) {
        // submitGeneralMessage Alert provides copy; skip extra toast noise.
      } else if (error instanceof ApiError) {
        showUserFacingErrorToast(null, "We could not submit your request. Please review your details and try again.", "form");
      } else {
        showUserFacingErrorToast(error, "We could not submit your request. Please try again.", "generic");
      }
    }
  }, [
    doctorId,
    dpdpConsentAccepted,
    firstName,
    lastName,
    phone,
    email,
    dateOfBirth,
    reason,
    notes,
    requiresOtp,
    runPhoneCheck,
    selectedEnd,
    selectedSlotDoctorId,
    selectedStart,
    siteKey,
    slotDate,
    submit,
    turnstileToken,
    verificationToken,
    setSubmitFieldErrors,
    setSubmitGeneralMessage,
    setDone,
  ]);

  return {
    phoneCheck,
    otpRequest,
    otpVerify,
    submit,
    runPhoneCheck,
    handleRequestOtp,
    handleVerifyOtp,
    handleSubmit,
  };
}
