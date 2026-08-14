// check-as-cast-density: allow-file — the welcome-resend mutation
// payload is empty and typed `BodyInit`; the cast bridges
// `{}` to the fetch body type without a runtime conversion.
import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalReferralPayout,
  InternalReferralPayoutSummaryRow,
  InternalReferrer,
  ReferrerMessageLogEntry,
} from "../referrals.types";

export function useInternalReferrers(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalReferrer[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  return useQuery({
    queryKey: internalQueryKeys.internal.referrers(),
    queryFn: () => fetcher<InternalReferrer[]>("/internal/referrers"),
    enabled: Boolean(token),
    ...options,
  });
}

export function useInternalReferrerMessages(
  token: string | null | undefined,
  referrerId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<ReferrerMessageLogEntry[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  return useQuery({
    queryKey: internalQueryKeys.internal.referrerMessages(referrerId ?? ""),
    queryFn: () =>
      fetcher<ReferrerMessageLogEntry[]>(
        `/internal/referrers/${referrerId}/messages`,
      ),
    enabled: Boolean(token && referrerId),
    ...options,
  });
}

export function useInternalResendWelcome(token: string | null | undefined) {
  const fetcher = useDataAccessFetcher();
  const queryClient = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (referrerId: string) =>
      fetcher<{ ok: true }>(
        `/internal/referrers/${referrerId}/resend-welcome`,
        { method: "POST", body: {} as unknown as BodyInit },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.referrers(),
      });
    },
  });
}

export function useInternalReferralPayouts(
  token: string | null | undefined,
  status: string = "",
  options?: Omit<
    UseQueryOptions<InternalReferralPayout[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  return useQuery({
    queryKey: internalQueryKeys.internal.referralPayouts(status),
    queryFn: () =>
      fetcher<InternalReferralPayout[]>(
        status
          ? `/internal/referral-payouts?status=${encodeURIComponent(status)}`
          : "/internal/referral-payouts",
      ),
    enabled: Boolean(token),
    ...options,
  });
}

export function useInternalReferralPayoutSummary(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalReferralPayoutSummaryRow[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  return useQuery({
    queryKey: internalQueryKeys.internal.referralPayoutSummary(),
    queryFn: () =>
      fetcher<InternalReferralPayoutSummaryRow[]>(
        "/internal/referral-payouts/summary",
      ),
    enabled: Boolean(token),
    ...options,
  });
}
