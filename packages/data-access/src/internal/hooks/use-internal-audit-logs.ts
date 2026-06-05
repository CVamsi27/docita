import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type { InternalAuditLog } from "../audit.types";

export function useInternalAuditLogs(
  params: string,
  options?: Omit<
    UseQueryOptions<InternalAuditLog[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.auditLogs(params),
    queryFn: async () => {
      const data = await fetcher<
        InternalAuditLog[] | { logs?: InternalAuditLog[] }
      >(`/audit-logs?${params}`);
      return Array.isArray(data) ? data : (data.logs ?? []);
    },
    refetchInterval: 30_000,
    ...options,
  });
}
