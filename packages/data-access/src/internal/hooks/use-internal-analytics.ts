import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type { InternalAnalyticsData } from "../analytics.types";

export function useInternalAnalytics(
  token: string | null | undefined,
  analyticsParams: string,
  options?: Omit<
    UseQueryOptions<InternalAnalyticsData, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.analytics(analyticsParams),
    queryFn: () =>
      fetcher<InternalAnalyticsData>(`/internal/analytics?${analyticsParams}`),
    enabled: Boolean(token),
    ...options,
  });
}
