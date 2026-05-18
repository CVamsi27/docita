"use client";

import { useMutation } from "@tanstack/react-query";
import {
  subscriptionBillingResumePaymentResponseSchema,
  type SubscriptionBillingResumePaymentResponse,
} from "@workspace/types";
import { fetchJsonWithSession } from "@/lib/auth/fetch-with-session";

export function useResumeSubscriptionPayment() {
  return useMutation({
    mutationFn: async (paymentId: string) => {
      return subscriptionBillingResumePaymentResponseSchema.parse(
        await fetchJsonWithSession<unknown>(
          `/subscription/billing/payments/${paymentId}/resume`,
          { method: "POST" },
        ),
      ) as SubscriptionBillingResumePaymentResponse;
    },
  });
}

