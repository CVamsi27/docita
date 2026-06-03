"use client";

import { useCallback } from "react";
import {
  usePublicBookingOtpRequest,
  usePublicBookingOtpVerify,
  usePublicBookingPhoneCheck,
  usePublicBookingSubmit,
} from "@workspace/data-access";
import { ApiError } from "@/lib/errors";
import { buildPublicBookingSubmitErrors } from "@/lib/utils/api-validation-errors";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  validateBookingFields,
  buildBookingRequestBody,
} from "./public-booking-submit-helpers";

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
  setSubmitFieldErrors: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
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
  }, [
    otp,
    otpVerify,
    phone,
    setVerificationToken,
    setFirstName,
    setLastName,
    setEmail,
    setSubmitFieldErrors,
  ]);

  const handleSubmit = useCallback(async () => {
    setSubmitFieldErrors({});
    setSubmitGeneralMessage(null);

    try {
      let otpRequired = requiresOtp;
      if (otpRequired === null) {
        const check = await runPhoneCheck();
        otpRequired = check.requiresOtp;
      }

      const validationError = validateBookingFields({
        slotDate,
        phone,
        requiresOtp: otpRequired,
        verificationToken,
        firstName,
        lastName,
        dateOfBirth,
        dpdpConsentAccepted,
      });
      if (validationError) {
        showUserFacingErrorToast(null, validationError, "generic");
        return;
      }

      const submitPayload = buildBookingRequestBody({
        phone,
        firstName,
        lastName,
        email,
        dateOfBirth,
        doctorId,
        selectedSlotDoctorId,
        slotDate,
        selectedStart,
        selectedEnd,
        reason,
        notes,
        turnstileToken,
        verificationToken,
        requiresOtp,
        dpdpConsentAccepted,
        otpRequired,
      });

      await submit.mutateAsync(submitPayload);
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
        showUserFacingErrorToast(
          null,
          "Review the fields marked below and try again.",
          "form",
        );
      } else if (generalMessage) {
        // submitGeneralMessage Alert provides copy; skip extra toast noise.
      } else if (error instanceof ApiError) {
        showUserFacingErrorToast(
          null,
          "We could not submit your request. Please review your details and try again.",
          "form",
        );
      } else {
        showUserFacingErrorToast(
          error,
          "We could not submit your request. Please try again.",
          "generic",
        );
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
