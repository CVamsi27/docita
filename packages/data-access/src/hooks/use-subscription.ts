import {
  type SubscriptionCurrentResponse,
  subscriptionCurrentResponseSchema,
} from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIQuery } from "../core/use-api-query";

export const useSubscription = (queryOptions?: { enabled?: boolean }) => {
  return useAPIQuery<SubscriptionCurrentResponse>(
    queryKeys.clinic.subscriptionSettings(),
    "/subscription/current",
    {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      ...queryOptions,
      select: (data) => subscriptionCurrentResponseSchema.parse(data),
    },
  );
};
