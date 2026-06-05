import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { WhatsAppBroadcastJobSummary } from "@workspace/types";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";

export function useInternalBroadcastsList(
  limit: number,
  options?: Omit<
    UseQueryOptions<WhatsAppBroadcastJobSummary[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.broadcasts(limit),
    queryFn: () =>
      fetcher<WhatsAppBroadcastJobSummary[]>(
        `/internal/broadcasts?limit=${limit}`,
      ),
    ...options,
  });
}
