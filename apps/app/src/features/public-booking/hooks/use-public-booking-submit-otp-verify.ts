"use client";

import { useCallback } from "react";
import { usePublicBookingOtpVerify } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function useBookingOtpVerify(
  referralCode: string,
  phone: string,
  otp: string,
  setVerificationToken: (v: string | null) => void,
  setFirstName: (v: string) => void,
  setLastName: (v: string) => void,
  setEmail: (v: string) => void,
  setSubmitFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
) {
  const otpVerify = usePublicBookingOtpVerify(referralCode);

  const handleVerifyOtp = useCallback(async () => {
    try {
      const res = await otpVerify.mutateAsync({ phoneNumber: phone, otp });
      setVerificationToken(res.bookingVerificationToken);
      setFirstName(res.patient.firstName);
      setLastName(res.patient.lastName);
      if (res.patient.email) setEmail(res.patient.email);
      setSubmitFieldErrors((prev) => { const n = { ...prev }; delete n.bookingVerificationToken; return n; });
    } catch (error) {
      showUserFacingErrorToast(error, "That code did not work. Please try again.", "generic");
    }
  }, [otp, otpVerify, phone, setVerificationToken, setFirstName, setLastName, setEmail, setSubmitFieldErrors]);

  return { otpVerify, handleVerifyOtp };
}
