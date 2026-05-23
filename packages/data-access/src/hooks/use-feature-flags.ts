import { QUERY_STALE_TIMES } from "../lib/query-stale-times";
import { queryKeys } from "../lib/query-keys";
import { useAPIQuery } from "../core/use-api-query";

export interface ResolvedFeatureFlagsResponse {
  flags: Record<string, boolean>;
}

export const useResolvedFeatureFlags = () =>
  useAPIQuery<ResolvedFeatureFlagsResponse>(
    queryKeys.featureFlags.me(),
    "/feature-flags/me",
    {
      staleTime: QUERY_STALE_TIMES.featureFlags,
      gcTime: QUERY_STALE_TIMES.featureFlags * 3,
    },
  );
