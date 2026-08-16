import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { partnerApi, type PartnerApiContext } from "../api";
import type {
  PartnerFacilityLeadSubmit,
  PartnerFacilityLeadView,
  PartnerMe,
  PartnerOtpRequest,
  PartnerOtpVerify,
  PartnerOtpVerifyResponse,
  PartnerPayoutDetailsInput,
  PartnerPayoutDetailsView,
  PartnerPayoutsResponse,
  PartnerReferralsResponse,
  PartnerShareMessageResponse,
  PartnerMyLeadsResponse,
} from "../partner.types";

export const partnerPortalQueryKeys = {
  root: () => ["partner"] as const,
  me: () => ["partner", "me"] as const,
  payouts: (filters: { status?: string; cursor?: string } | undefined) =>
    ["partner", "payouts", filters ?? {}] as const,
  referrals: (filters: { status?: string; cursor?: string } | undefined) =>
    ["partner", "referrals", filters ?? {}] as const,
  myLeads: () => ["partner", "my-leads"] as const,
  shareMessage: () => ["partner", "share-message"] as const,
};

function ctxFromToken(
  accessToken: string | null,
  baseUrl?: string,
): PartnerApiContext {
  return { accessToken, baseUrl };
}

// ---------- Auth (token-less) ----------

export function usePartnerRequestOtp(
  options?: Omit<
    UseMutationOptions<
      { message: string; expiresInSeconds: number },
      Error,
      PartnerOtpRequest
    >,
    "mutationFn"
  >,
) {
  return useMutation<
    { message: string; expiresInSeconds: number },
    Error,
    PartnerOtpRequest
  >({
    mutationFn: (input) =>
      partnerApi.requestOtp(input, ctxFromToken(null)),
    ...options,
  });
}

export function usePartnerVerifyOtp(
  options?: Omit<
    UseMutationOptions<
      PartnerOtpVerifyResponse,
      Error,
      PartnerOtpVerify
    >,
    "mutationFn"
  >,
) {
  return useMutation<PartnerOtpVerifyResponse, Error, PartnerOtpVerify>({
    mutationFn: (input) => partnerApi.verifyOtp(input, ctxFromToken(null)),
    ...options,
  });
}

export function usePartnerRefresh(
  options?: Omit<
    UseMutationOptions<
      { accessToken: string; expiresIn: number },
      Error,
      { refreshToken: string }
    >,
    "mutationFn"
  >,
) {
  return useMutation<
    { accessToken: string; expiresIn: number },
    Error,
    { refreshToken: string }
  >({
    mutationFn: ({ refreshToken }) =>
      partnerApi.refresh(refreshToken, ctxFromToken(null)),
    ...options,
  });
}

// ---------- Authenticated (token required) ----------

export function usePartnerMe(
  accessToken: string | null,
  baseUrl?: string,
  options?: Omit<UseQueryOptions<PartnerMe, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<PartnerMe, Error>({
    queryKey: partnerPortalQueryKeys.me(),
    queryFn: () => partnerApi.getMe(ctxFromToken(accessToken, baseUrl)),
    enabled: Boolean(accessToken),
    ...options,
  });
}

export function usePartnerPayouts(
  accessToken: string | null,
  baseUrl?: string,
  filters?: { status?: string; cursor?: string },
  options?: Omit<
    UseQueryOptions<PartnerPayoutsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<PartnerPayoutsResponse, Error>({
    queryKey: partnerPortalQueryKeys.payouts(filters),
    queryFn: () =>
      partnerApi.listPayouts(filters, ctxFromToken(accessToken, baseUrl)),
    enabled: Boolean(accessToken),
    ...options,
  });
}

export function usePartnerReferrals(
  accessToken: string | null,
  baseUrl?: string,
  filters?: { status?: string; cursor?: string },
  options?: Omit<
    UseQueryOptions<PartnerReferralsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<PartnerReferralsResponse, Error>({
    queryKey: partnerPortalQueryKeys.referrals(filters),
    queryFn: () =>
      partnerApi.listReferrals(filters, ctxFromToken(accessToken, baseUrl)),
    enabled: Boolean(accessToken),
    ...options,
  });
}

export function usePartnerShareMessage(
  accessToken: string | null,
  baseUrl?: string,
  options?: Omit<
    UseQueryOptions<PartnerShareMessageResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<PartnerShareMessageResponse, Error>({
    queryKey: partnerPortalQueryKeys.shareMessage(),
    queryFn: () =>
      partnerApi.getShareMessage(ctxFromToken(accessToken, baseUrl)),
    enabled: Boolean(accessToken),
    ...options,
  });
}

export function usePartnerMyLeads(
  accessToken: string | null,
  baseUrl?: string,
  options?: Omit<
    UseQueryOptions<PartnerMyLeadsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<PartnerMyLeadsResponse, Error>({
    queryKey: partnerPortalQueryKeys.myLeads(),
    queryFn: () =>
      partnerApi.listMyLeads(undefined, ctxFromToken(accessToken, baseUrl)),
    enabled: Boolean(accessToken),
    ...options,
  });
}

export function useSubmitFacilityLead(
  accessToken: string | null,
  baseUrl?: string,
  options?: Omit<
    UseMutationOptions<
      PartnerFacilityLeadView,
      Error,
      PartnerFacilityLeadSubmit
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    PartnerFacilityLeadView,
    Error,
    PartnerFacilityLeadSubmit
  >({
    mutationFn: (input) =>
      partnerApi.submitFacilityLead(input, ctxFromToken(accessToken, baseUrl)),
    onSuccess: () => {
      // The partner's submission list must reflect the new lead immediately
      // (the app's QueryClient keeps a 30s stale window; SPA navigation does
      // not refetch on focus).
      void queryClient.invalidateQueries({
        queryKey: partnerPortalQueryKeys.myLeads(),
      });
    },
    ...options,
  });
}

export function usePartnerPayoutDetails(
  accessToken: string | null,
  baseUrl?: string,
  options?: Omit<
    UseMutationOptions<
      PartnerPayoutDetailsView,
      Error,
      PartnerPayoutDetailsInput
    >,
    "mutationFn"
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    PartnerPayoutDetailsView,
    Error,
    PartnerPayoutDetailsInput
  >({
    mutationFn: (input) =>
      partnerApi.upsertPayoutDetails(input, ctxFromToken(accessToken, baseUrl)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: partnerPortalQueryKeys.me(),
      });
    },
    ...options,
  });
}
