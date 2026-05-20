import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalFeedback,
  InternalFeedbackFilters,
  InternalFeedbackStats,
} from "../feedback.types";

export function useInternalFeedbackList(
  filtersKey: string,
  filters?: InternalFeedbackFilters,
  options?: Omit<
    UseQueryOptions<InternalFeedback[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.feedback(filtersKey),
    queryFn: () =>
      fetcher<InternalFeedback[]>("/internal/feedback/all", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      }),
    ...options,
  });
}

export function useInternalFeedbackStats(
  clinicId?: string,
  options?: Omit<
    UseQueryOptions<InternalFeedbackStats, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.feedbackStats(),
    queryFn: () =>
      fetcher<InternalFeedbackStats>("/internal/feedback/stats", {
        params: { clinicId },
      }),
    ...options,
  });
}
