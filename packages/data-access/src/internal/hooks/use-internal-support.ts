import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type {
  SupportWhatsAppMessage,
  SupportWhatsAppThreadSummary,
} from "@workspace/types";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";

export function useInternalSupportWhatsAppThreads(
  limit: number,
  options?: Omit<
    UseQueryOptions<SupportWhatsAppThreadSummary[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.supportWhatsAppThreads(limit),
    queryFn: () =>
      fetcher<SupportWhatsAppThreadSummary[]>(
        `/internal/support/whatsapp?limit=${limit}`,
      ),
    ...options,
  });
}

export function useInternalSupportWhatsAppThreadMessages(
  threadPhoneNumber: string | null,
  limit: number,
  options?: Omit<
    UseQueryOptions<SupportWhatsAppMessage[], Error>,
    "queryKey" | "queryFn" | "enabled"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: threadPhoneNumber
      ? internalQueryKeys.internal.supportWhatsAppThreadMessages(
          threadPhoneNumber,
          limit,
        )
      : (["internal", "support", "whatsapp", "thread", ""] as const),
    queryFn: () =>
      fetcher<SupportWhatsAppMessage[]>(
        `/internal/support/whatsapp/${encodeURIComponent(threadPhoneNumber ?? "")}/messages?limit=${limit}`,
      ),
    enabled: Boolean(threadPhoneNumber),
    ...options,
  });
}
