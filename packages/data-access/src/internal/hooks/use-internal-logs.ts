import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalSystemLog,
  InternalSystemLogsResult,
} from "../logs.types";

export function useInternalSystemLogs(
  token: string | null | undefined,
  logsParams: string,
  options?: Omit<
    UseQueryOptions<InternalSystemLogsResult, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.logs(logsParams),
    queryFn: async () => {
      const json = await fetcher<
        InternalSystemLog[] | { data?: InternalSystemLog[]; total?: number }
      >(`/internal/logs?${logsParams}`);
      const logsData = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
          ? json.data
          : [];
      const total = Array.isArray(json)
        ? json.length
        : typeof json.total === "number"
          ? json.total
          : logsData.length;

      return { logs: logsData, total };
    },
    enabled: Boolean(token),
    ...options,
  });
}
