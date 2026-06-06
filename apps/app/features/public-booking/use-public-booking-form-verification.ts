"use client";

import { useEffect, useState } from "react";

export function usePublicBookingVerification(
  setDateOfBirth: (v: string) => void,
  setDpdpConsentAccepted: (v: boolean) => void,
) {
  const [requiresOtp, setRequiresOtp] = useState<boolean | null>(null);
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  useEffect(() => {
    if (requiresOtp === true) {
      setDateOfBirth("");
      setDpdpConsentAccepted(false);
    }
  }, [requiresOtp, setDateOfBirth, setDpdpConsentAccepted]);

  return {
    requiresOtp, setRequiresOtp,
    otp, setOtp,
    verificationToken, setVerificationToken,
  };
}
