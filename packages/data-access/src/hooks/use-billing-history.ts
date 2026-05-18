import {
  type SubscriptionBillingPaymentHistoryItem,
  subscriptionBillingPaymentHistoryResponseSchema,
} from "@workspace/types";
import { useAPIQueryValidated } from "../core/use-api-query-validated";

export type BillingHistoryItem = SubscriptionBillingPaymentHistoryItem;

const billingHistorySchema = subscriptionBillingPaymentHistoryResponseSchema.transform(
  (items) => [...items] as BillingHistoryItem[],
);

export function useBillingHistory(enabled = true) {
  return useAPIQueryValidated(
    ["billing-history"],
    "/subscription/billing/payments",
    billingHistorySchema,
    {
      enabled,
      staleTime: 5 * 60 * 1000,
    },
  );
}
