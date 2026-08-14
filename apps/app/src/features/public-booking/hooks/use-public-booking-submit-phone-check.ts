"use client";

import { useCallback } from "react";
import { usePublicBookingPhoneCheck } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function useBookingPhoneCheck(referralCode: string, phone: string, turnstileToken: string | null, setRequiresOtp: (v: boolean | null) => void) {
  const phoneCheck = usePublicBookingPhoneCheck(referralCode);

  const runPhoneCheck = useCallback(async () => {
    try {
      const res = await phoneCheck.mutateAsync({ phoneNumber: phone, turnstileToken: turnstileToken ?? undefined });
      setRequiresOtp(res.requiresOtp);
      return res;
    } catch (error) {
      showUserFacingErrorToast(error, "We could not verify this phone number. Please try again.", "generic");
      throw error;
    }
  }, [phone, phoneCheck, turnstileToken, setRequiresOtp]);

  return { phoneCheck, runPhoneCheck };
}
