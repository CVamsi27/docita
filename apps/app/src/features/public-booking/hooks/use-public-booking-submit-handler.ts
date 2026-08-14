"use client";

import { useCallback } from "react";
import { usePublicBookingSubmit } from "@workspace/data-access";
import { ApiError } from "@/lib/errors";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { validateBookingFields, buildBookingRequestBody, processPublicBookingSubmitError } from "./public-booking-submit-helpers";

interface BookingSubmitParams {
  referralCode: string;
  phone: string; firstName: string; lastName: string; email: string;
  dateOfBirth: string; reason: string; notes: string;
  doctorId: string; selectedSlotDoctorId: string | null;
  slotDate: string; selectedStart: string | null; selectedEnd: string | null;
  turnstileToken: string | null; verificationToken: string | null;
  requiresOtp: boolean | null; dpdpConsentAccepted: boolean;
  siteKey: string | undefined;
  runPhoneCheck: () => Promise<{ requiresOtp: boolean }>;
  setSubmitFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSubmitGeneralMessage: (v: string | null) => void;
  setDone: (v: boolean) => void;
}

export function useBookingSubmit(params: BookingSubmitParams) {
  const submit = usePublicBookingSubmit(params.referralCode);
  const { phone, firstName, lastName, email, dateOfBirth, reason, notes, doctorId, selectedSlotDoctorId, slotDate, selectedStart, selectedEnd, turnstileToken, verificationToken, requiresOtp, dpdpConsentAccepted, siteKey, runPhoneCheck, setSubmitFieldErrors, setSubmitGeneralMessage, setDone } = params;

  const handleSubmit = useCallback(async () => {
    setSubmitFieldErrors({}); setSubmitGeneralMessage(null);
    try {
      let otpRequired = requiresOtp;
      if (otpRequired === null) {
        const check = await runPhoneCheck();
        otpRequired = check.requiresOtp;
      }
      const validationError = validateBookingFields({ slotDate, phone, requiresOtp: otpRequired, verificationToken, firstName, lastName, dateOfBirth, dpdpConsentAccepted });
      if (validationError) { showUserFacingErrorToast(null, validationError, "generic"); return; }
      const payload = buildBookingRequestBody({ phone, firstName, lastName, email, dateOfBirth, doctorId, selectedSlotDoctorId, slotDate, selectedStart, selectedEnd, reason, notes, turnstileToken, verificationToken, requiresOtp, dpdpConsentAccepted, otpRequired });
      await submit.mutateAsync(payload);
      setDone(true);
    } catch (error) {
      const { fieldErrors, generalMessage } = processPublicBookingSubmitError(error, siteKey);
      setSubmitFieldErrors(fieldErrors); setSubmitGeneralMessage(generalMessage);
      if (Object.keys(fieldErrors).length > 0) {
        showUserFacingErrorToast(null, "Review the fields marked below and try again.", "form");
      } else if (!generalMessage) {
        if (error instanceof ApiError) {
          showUserFacingErrorToast(null, "We could not submit your request. Please review your details and try again.", "form");
        } else {
          showUserFacingErrorToast(error, "We could not submit your request. Please try again.", "generic");
        }
      }
    }
  }, [phone, firstName, lastName, email, dateOfBirth, reason, notes, doctorId, selectedSlotDoctorId, slotDate, selectedStart, selectedEnd, turnstileToken, verificationToken, requiresOtp, dpdpConsentAccepted, siteKey, runPhoneCheck, submit, setSubmitFieldErrors, setSubmitGeneralMessage, setDone]);

  return { submit, handleSubmit };
}
