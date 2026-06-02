"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { useResolvedFeatureFlags } from "@workspace/data-access";

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isError: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(
  null,
);

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading, isError } = useResolvedFeatureFlags();
  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      flags: data?.flags ?? {},
      isLoading,
      isError,
    }),
    [data?.flags, isLoading, isError],
  );
  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

/**
 * Returns the resolved boolean for a feature flag in the current
 * authenticated context. Returns `undefined` while loading and `false`
 * if the flag is unknown so callers do not gate UI on a loading
 * spinner accidentally.
 */
export const useFeatureFlag = (key: string): boolean | undefined => {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) return false;
  if (ctx.isLoading) return undefined;
  return Boolean(ctx.flags[key]);
};
