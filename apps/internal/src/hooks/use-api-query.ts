import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { apiGet } from "@/lib/api/api-client";

/**
 * Thin React Query wrapper for the internal portal's `apiGet` client.
 *
 * Usage:
 * ```ts
 * const { data, isLoading, error } = useApiQuery<MyType>("/api/internal/items");
 * ```
 *
 * For list queries with custom options:
 * ```ts
 * const { data, isLoading, error, refetch } = useApiQuery<Item[]>("/api/internal/items", {
 *   refetchInterval: 30_000,
 * });
 * ```
 */
export function useApiQuery<T>(
  path: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> & {
    queryKey?: readonly unknown[];
  },
): UseQueryResult<T> {
  return useQuery<T>({
    queryKey: options?.queryKey ?? ["internal", path],
    queryFn: () => apiGet<T>(path),
    ...options,
  });
}
