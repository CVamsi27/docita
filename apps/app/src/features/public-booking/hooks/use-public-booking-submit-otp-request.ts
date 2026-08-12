"use client";

import { useCallback } from "react";
import { usePublicBookingOtpRequest } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function useBookingOtpRequest(
  referralCode: string, phone: string, turnstileToken: string | null,
  runPhoneCheck: () => Promise<{ requiresOtp: boolean }>,
) {
  const otpRequest = usePublicBookingOtpRequest(referralCode);

  const handleRequestOtp = useCallback(async () => {
    try {
      await runPhoneCheck();
      await otpRequest.mutateAsync({ phoneNumber: phone, turnstileToken: turnstileToken ?? undefined });
    } catch (error) {
      showUserFacingErrorToast(error, "We could not send a verification code. Please try again.", "generic");
    }
  }, [otpRequest, phone, runPhoneCheck, turnstileToken]);

  return { otpRequest, handleRequestOtp };
}
