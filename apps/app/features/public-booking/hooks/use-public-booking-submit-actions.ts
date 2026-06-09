"use client";

import { useBookingPhoneCheck } from "./use-public-booking-submit-phone-check";
import { useBookingOtpRequest } from "./use-public-booking-submit-otp-request";
import { useBookingOtpVerify } from "./use-public-booking-submit-otp-verify";
import { useBookingSubmit } from "./use-public-booking-submit-handler";

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

  const { phoneCheck, runPhoneCheck } = useBookingPhoneCheck(
    referralCode,
    phone,
    turnstileToken,
    setRequiresOtp,
  );
  const { otpRequest, handleRequestOtp } = useBookingOtpRequest(
    referralCode,
    phone,
    turnstileToken,
    runPhoneCheck,
  );
  const { otpVerify, handleVerifyOtp } = useBookingOtpVerify(
    referralCode,
    phone,
    otp,
    setVerificationToken,
    setFirstName,
    setLastName,
    setEmail,
    setSubmitFieldErrors,
  );
  const { submit, handleSubmit } = useBookingSubmit({
    referralCode,
    phone,
    firstName,
    lastName,
    email,
    dateOfBirth,
    reason,
    notes,
    doctorId,
    selectedSlotDoctorId,
    slotDate,
    selectedStart,
    selectedEnd,
    turnstileToken,
    verificationToken,
    requiresOtp,
    dpdpConsentAccepted,
    siteKey,
    runPhoneCheck,
    setSubmitFieldErrors,
    setSubmitGeneralMessage,
    setDone,
  });

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
