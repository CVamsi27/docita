import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys-internal";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalFeedback,
  InternalFeedbackFilters,
  InternalFeedbackStats,
} from "../feedback.types";

function toFeedbackListParams(
  filters: InternalFeedbackFilters,
): Record<string, string | number | boolean | undefined | null> {
  const params: Record<string, string | number | boolean | undefined | null> =
    {};
  if (filters.status !== undefined) params["status"] = filters.status;
  if (filters.category !== undefined) params["category"] = filters.category;
  if (filters.clinicId !== undefined) params["clinicId"] = filters.clinicId;
  if (filters.startDate !== undefined) params["startDate"] = filters.startDate;
  if (filters.endDate !== undefined) params["endDate"] = filters.endDate;
  if (filters.minRating !== undefined) params["minRating"] = filters.minRating;
  if (filters.maxRating !== undefined) params["maxRating"] = filters.maxRating;
  return params;
}

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
        params: filters ? toFeedbackListParams(filters) : undefined,
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
