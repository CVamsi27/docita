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
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  );
