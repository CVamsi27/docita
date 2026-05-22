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
import { queryKeys } from "../lib/query-keys";
import { useDataAccessContext } from "../provider/hooks";

function clinicsBase(referralCode: string) {
  return `/public/booking/clinics/${encodeURIComponent(referralCode)}`;
}

export function usePublicBookingClinic(referralCode: string) {
  const { fetcher } = useDataAccessContext();
  return useQuery({
    queryKey: queryKeys.publicBooking.clinic(referralCode),
    queryFn: () =>
      fetcher<PublicBookingClinicResponse>(clinicsBase(referralCode), {
        skipAuth: true,
        suppressGlobalErrorToast: true,
      }),
    enabled: referralCode.length > 0,
  });
}

export function usePublicBookingDoctors(referralCode: string) {
  const { fetcher } = useDataAccessContext();
  return useQuery({
    queryKey: queryKeys.publicBooking.doctors(referralCode),
    queryFn: () =>
      fetcher<PublicBookingDoctorsResponse>(
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
  const { fetcher } = useDataAccessContext();
  const doctorParam =
    doctorId && doctorId !== "any"
      ? `doctorId=${encodeURIComponent(doctorId)}&`
      : "";
  return useQuery({
    queryKey: queryKeys.publicBooking.slots(referralCode, doctorId, date),
    queryFn: () =>
      fetcher<PublicBookingSlotsResponse>(
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
  const { fetcher } = useDataAccessContext();
  return useQuery({
    queryKey: queryKeys.publicBooking.context(
      referralCode,
      bookingVerificationToken,
    ),
    queryFn: () =>
      fetcher<PublicBookingContextResponse>(
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
  const { fetcher } = useDataAccessContext();
  return useMutation({
    mutationFn: (body: { phoneNumber: string; turnstileToken?: string }) =>
      fetcher<PublicBookingPhoneCheckResponse>(
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
  const { fetcher } = useDataAccessContext();
  return useMutation({
    mutationFn: (body: { phoneNumber: string; turnstileToken?: string }) =>
      fetcher<{ message: string; expiresInSeconds: number }>(
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
  const { fetcher } = useDataAccessContext();
  return useMutation({
    mutationFn: (body: { phoneNumber: string; otp: string }) =>
      fetcher<PublicBookingOtpVerifyResponse>(
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
  const { fetcher } = useDataAccessContext();
  return useMutation({
    mutationFn: (args: {
      body: Record<string, unknown>;
      authorization?: string;
    }) =>
      fetcher<PublicBookingSubmitResponse>(
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
