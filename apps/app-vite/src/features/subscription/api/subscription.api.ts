import { api } from "@/lib/api/api-client";
import {
  subscriptionBillingActivateResponseSchema,
  subscriptionBillingCheckoutResponseSchema,
  type PlanMode,
  type TierName,
} from "@workspace/types";

export interface SubscriptionCheckoutParams {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
  planMode?: PlanMode;
}

export interface SubscriptionActivateParams {
  razorpayPaymentId: string;
  razorpayOrderId: string;
  razorpaySignature: string;
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
  planMode: PlanMode;
}

export async function createSubscriptionCheckout(
  params: SubscriptionCheckoutParams,
) {
  const data = await api.post("/subscription/billing/checkout", {
    tier: params.tier,
    billingCycle: params.billingCycle,
    planMode: params.planMode ?? "FULL",
  });
  return subscriptionBillingCheckoutResponseSchema.parse(data);
}

export async function activateSubscription(
  params: SubscriptionActivateParams,
) {
  const data = await api.post("/subscription/billing/activate", {
    razorpayPaymentId: params.razorpayPaymentId,
    razorpayOrderId: params.razorpayOrderId,
    razorpaySignature: params.razorpaySignature,
    tier: params.tier,
    billingCycle: params.billingCycle,
    planMode: params.planMode,
  });
  return subscriptionBillingActivateResponseSchema.parse(data);
}
