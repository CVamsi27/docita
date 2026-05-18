import { useAPIQuery } from "../core/use-api-query";

export interface ResolvedFeatureFlagsResponse {
  flags: Record<string, boolean>;
}

export const useResolvedFeatureFlags = () =>
  useAPIQuery<ResolvedFeatureFlagsResponse>(
    ["feature-flags", "me"],
    "/feature-flags/me",
    {
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  );
