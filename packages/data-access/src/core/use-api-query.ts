import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useDataAccessFetcher } from "../provider/hooks";
import { inferStaleTime } from "./stale-time";

export function useAPIQuery<T, TError = Error>(
  key: readonly (string | number | Record<string, unknown>)[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T, TError>, "queryKey" | "queryFn">,
) {
  const fetcher = useDataAccessFetcher();
  const inferredStaleTime =
    options?.staleTime === undefined ? inferStaleTime(key) : undefined;
  return useQuery<T, TError>({
    queryKey: key,
    queryFn: () => fetcher<T>(endpoint),
    ...(inferredStaleTime !== undefined
      ? { staleTime: inferredStaleTime }
      : {}),
    ...options,
  });
}
