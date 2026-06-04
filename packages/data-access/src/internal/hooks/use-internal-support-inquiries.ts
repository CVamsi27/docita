import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { SupportInquiry } from "@workspace/types";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";

export function useInternalSupportInquiries(
  limit: number,
  options?: Omit<
    UseQueryOptions<SupportInquiry[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.supportInquiries(limit),
    queryFn: () =>
      fetcher<SupportInquiry[]>(`/internal/support/inquiries?limit=${limit}`),
    ...options,
  });
}
