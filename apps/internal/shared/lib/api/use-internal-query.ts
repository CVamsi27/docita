"use client";

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth";

export function useInternalQuery<
  TData,
  TError = Error,
  TQueryKey extends readonly unknown[] = readonly unknown[],
>(
  options: UseQueryOptions<TData, TError, TData, TQueryKey>,
): UseQueryResult<TData, TError> {
  const { token } = useAuth();
  const tokenReady = Boolean(token);
  const callerEnabled = options.enabled ?? true;

  return useQuery({
    ...options,
    enabled:
      typeof callerEnabled === "function"
        ? callerEnabled
        : tokenReady && callerEnabled,
    refetchInterval:
      typeof options.refetchInterval === "function"
        ? options.refetchInterval
        : tokenReady
          ? options.refetchInterval
          : false,
  });
}
