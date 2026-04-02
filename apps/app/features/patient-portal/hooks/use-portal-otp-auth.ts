"use client";

import { useState } from "react";
import { fetchAPI } from "@/lib/api-core";
import { appSession } from "@/lib/session";

interface RequestOtpResponse {
  message: string;
  expiresInSeconds: number;
}

interface VerifyOtpResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    clinicId: string | null;
  };
}

export function usePortalOtpAuth() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpExpiresInSeconds, setOtpExpiresInSeconds] = useState(600);

  const requestOtp = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchAPI<RequestOtpResponse>(
        "/patient-portal/auth/request-otp",
        {
          method: "POST",
          body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
        },
      );
      setOtpExpiresInSeconds(response.expiresInSeconds);
      setStep("otp");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send OTP. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchAPI<VerifyOtpResponse>(
        "/patient-portal/auth/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({
            phoneNumber: phoneNumber.trim(),
            otp: otp.trim(),
          }),
        },
      );
      if (result.access_token) {
        appSession.setToken(result.access_token);
        localStorage.setItem("docita_user", JSON.stringify(result.user));
      }
      window.location.href = "/portal";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid OTP. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setStep("phone");
    setOtp("");
    setError(null);
  };

  const resendOtp = async () => {
    setOtp("");
    setError(null);
    await requestOtp();
  };

  return {
    phoneNumber,
    setPhoneNumber,
    otp,
    setOtp,
    step,
    isLoading,
    error,
    otpExpiresInSeconds,
    requestOtp,
    verifyOtp,
    goBack,
    resendOtp,
  };
}
