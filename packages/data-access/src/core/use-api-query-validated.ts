import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import { useDataAccessFetcher } from "../provider/hooks";
import { inferStaleTime } from "./stale-time";

export function useAPIQueryValidated<
  TSchema extends z.ZodTypeAny,
  TError = Error,
>(
  key: readonly (string | number | Record<string, unknown>)[],
  endpoint: string,
  schema: TSchema,
  options?: Omit<
    UseQueryOptions<z.infer<TSchema>, TError>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  const inferredStaleTime =
    options?.staleTime === undefined ? inferStaleTime(key) : undefined;

  return useQuery<z.infer<TSchema>, TError>({
    queryKey: key,
    queryFn: async () => schema.parse(await fetcher(endpoint)),
    ...(inferredStaleTime !== undefined
      ? { staleTime: inferredStaleTime }
      : {}),
    ...options,
  });
}
