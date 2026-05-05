import { useAPIQuery } from "@/lib/api-core";

export interface ResolvedFeatureFlagsResponse {
  flags: Record<string, boolean>;
}

export const useResolvedFeatureFlags = () =>
  useAPIQuery<ResolvedFeatureFlagsResponse>(
    ["feature-flags", "me"],
    "/feature-flags/me",
    {
      staleTime: 1000 * 30,
    },
  );
