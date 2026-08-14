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
import { queryKeys } from "../lib/query-keys-clinician";
import { useDataAccessContext } from "../provider/hooks";

function clinicsBase(referralCode: string) {
  return `/public/booking/clinics/${encodeURIComponent(referralCode)}`;
}

/**
 * Shared `useMutation` shape for the public-booking POST endpoints
 * (`phone-check`, `otp/request`, `otp/verify`) — they only differ in the
 * response type, request-body shape, and URL suffix. The HTTP method, JSON
 * encoding, and `skipAuth`/`suppressGlobalErrorToast` bypass are identical
 * because all three run before a booking-verification token exists.
 */
function usePublicBookingPostMutation<TResponse, TBody>(
  referralCode: string,
  pathSuffix: string,
) {
  const { fetcher } = useDataAccessContext();
  return useMutation({
    mutationFn: (body: TBody) =>
      fetcher<TResponse>(`${clinicsBase(referralCode)}/${pathSuffix}`, {
        method: "POST",
        body: JSON.stringify(body),
        skipAuth: true,
        suppressGlobalErrorToast: true,
      }),
  });
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
  return usePublicBookingPostMutation<
    PublicBookingPhoneCheckResponse,
    { phoneNumber: string; turnstileToken?: string }
  >(referralCode, "phone-check");
}

export function usePublicBookingOtpRequest(referralCode: string) {
  return usePublicBookingPostMutation<
    { message: string; expiresInSeconds: number },
    { phoneNumber: string; turnstileToken?: string }
  >(referralCode, "otp/request");
}

export function usePublicBookingOtpVerify(referralCode: string) {
  return usePublicBookingPostMutation<
    PublicBookingOtpVerifyResponse,
    { phoneNumber: string; otp: string }
  >(referralCode, "otp/verify");
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
