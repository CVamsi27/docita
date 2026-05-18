import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  PublicBookingClinicResponse,
  PublicBookingContextResponse,
  PublicBookingDoctorsResponse,
  PublicBookingOtpVerifyResponse,
  PublicBookingPhoneCheckResponse,
  PublicBookingSlotsResponse,
  PublicBookingSubmitResponse,
} from "@workspace/types";
import { queryKeys } from "@workspace/data-access";
import { fetchAPI } from "@/lib/api/api-core";

function clinicsBase(referralCode: string) {
  return `/public/booking/clinics/${encodeURIComponent(referralCode)}`;
}

export function usePublicBookingClinic(referralCode: string) {
  return useQuery({
    queryKey: queryKeys.publicBooking.clinic(referralCode),
    queryFn: () =>
      fetchAPI<PublicBookingClinicResponse>(clinicsBase(referralCode), {
        skipAuth: true,
        suppressGlobalErrorToast: true,
      }),
    enabled: referralCode.length > 0,
  });
}

export function usePublicBookingDoctors(referralCode: string) {
  return useQuery({
    queryKey: queryKeys.publicBooking.doctors(referralCode),
    queryFn: () =>
      fetchAPI<PublicBookingDoctorsResponse>(
        `${clinicsBase(referralCode)}/doctors`,
        { skipAuth: true, suppressGlobalErrorToast: true },
      ),
    enabled: referralCode.length > 0,
  });
}

export function usePublicBookingSlots(
  referralCode: string,
  doctorId: string,
  date: string,
) {
  const doctorParam =
    doctorId && doctorId !== "any"
      ? `doctorId=${encodeURIComponent(doctorId)}&`
      : "";
  return useQuery({
    queryKey: queryKeys.publicBooking.slots(referralCode, doctorId, date),
    queryFn: () =>
      fetchAPI<PublicBookingSlotsResponse>(
        `${clinicsBase(referralCode)}/slots?${doctorParam}date=${encodeURIComponent(date)}`,
        { skipAuth: true, suppressGlobalErrorToast: true },
      ),
    enabled: referralCode.length > 0 && doctorId !== "" && !!date,
  });
}

export function usePublicBookingContext(
  referralCode: string,
  bookingVerificationToken: string | null,
) {
  return useQuery({
    queryKey: queryKeys.publicBooking.context(
      referralCode,
      bookingVerificationToken,
    ),
    queryFn: () =>
      fetchAPI<PublicBookingContextResponse>(
        `${clinicsBase(referralCode)}/context`,
        {
          skipAuth: true,
          suppressGlobalErrorToast: true,
          headers: {
            Authorization: `Bearer ${bookingVerificationToken}`,
          },
        },
      ),
    enabled:
      referralCode.length > 0 &&
      !!bookingVerificationToken &&
      bookingVerificationToken.length > 0,
  });
}

export function usePublicBookingPhoneCheck(referralCode: string) {
  return useMutation({
    mutationFn: (body: { phoneNumber: string; turnstileToken?: string }) =>
      fetchAPI<PublicBookingPhoneCheckResponse>(
        `${clinicsBase(referralCode)}/phone-check`,
        {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
          suppressGlobalErrorToast: true,
        },
      ),
  });
}

export function usePublicBookingOtpRequest(referralCode: string) {
  return useMutation({
    mutationFn: (body: { phoneNumber: string; turnstileToken?: string }) =>
      fetchAPI<{ message: string; expiresInSeconds: number }>(
        `${clinicsBase(referralCode)}/otp/request`,
        {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
          suppressGlobalErrorToast: true,
        },
      ),
  });
}

export function usePublicBookingOtpVerify(referralCode: string) {
  return useMutation({
    mutationFn: (body: { phoneNumber: string; otp: string }) =>
      fetchAPI<PublicBookingOtpVerifyResponse>(
        `${clinicsBase(referralCode)}/otp/verify`,
        {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
          suppressGlobalErrorToast: true,
        },
      ),
  });
}

export function usePublicBookingSubmit(referralCode: string) {
  return useMutation({
    mutationFn: (args: {
      body: Record<string, unknown>;
      authorization?: string;
    }) =>
      fetchAPI<PublicBookingSubmitResponse>(
        `${clinicsBase(referralCode)}/requests`,
        {
          method: "POST",
          body: JSON.stringify(args.body),
          skipAuth: true,
          suppressGlobalErrorToast: true,
          headers: args.authorization
            ? { Authorization: `Bearer ${args.authorization}` }
            : undefined,
        },
      ),
  });
}
