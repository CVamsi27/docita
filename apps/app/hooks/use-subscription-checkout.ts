import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type RazorpayResponse, useRazorpay } from "@/hooks/use-razorpay";
import { useAuth } from "@/lib/auth-context";
import { fetchJsonWithSession } from "@/lib/fetch-with-session";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  subscriptionBillingActivateResponseSchema,
  subscriptionBillingCheckoutResponseSchema,
  type TierName,
} from "@workspace/types";

export interface CheckoutSuccessData {
  planName: string;
  amount?: number;
  transactionId?: string;
}

interface TierCheckoutParams {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
}

export function useSubscriptionCheckout(
  onSuccess: (data: CheckoutSuccessData) => void,
) {
  const { token, user } = useAuth();
  const { setTier } = usePermissionStore();
  const queryClient = useQueryClient();
  const { openCheckout } = useRazorpay();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const invalidateSubscriptionQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["billing-status"] }),
      queryClient.invalidateQueries({ queryKey: ["clinic", "subscription"] }),
    ]);
  }, [queryClient]);

  const checkoutTier = useCallback(
    async ({ tier, billingCycle }: TierCheckoutParams) => {
      if (!token) {
        throw new Error("Please sign in to continue");
      }
      setIsProcessing(true);
      setProcessingId(`tier-${tier}`);

      try {
        const createData = subscriptionBillingCheckoutResponseSchema.parse(
          await fetchJsonWithSession<unknown>("/subscription/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier, billingCycle }),
          }),
        );
        const { orderId, amountCents, currency, razorpayKeyId } = createData;
        if (!orderId || !amountCents || !currency || !razorpayKeyId) {
          throw new Error("We could not start checkout. Please try again.");
        }

        await openCheckout({
          key: razorpayKeyId as string,
          amount: amountCents as number,
          currency: currency as string,
          name: "Docita Subscription",
          description: `Upgrade to ${tier} Plan`,
          order_id: orderId as string,
          handler: async (response: RazorpayResponse) => {
            subscriptionBillingActivateResponseSchema.parse(
              await fetchJsonWithSession<unknown>(
                "/subscription/billing/activate",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpaySignature: response.razorpay_signature,
                    tier,
                    billingCycle,
                  }),
                },
              ),
            );

            setTier(tier);
            await invalidateSubscriptionQueries();
            onSuccess({
              planName: `${tier} Plan`,
              amount: amountCents ? amountCents / 100 : undefined,
              transactionId: response.razorpay_payment_id,
            });
          },
          prefill: {
            name: user?.name || "Clinic Admin",
            email: user?.email || "",
          },
          theme: { color: "#0F172A" },
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "We could not process the upgrade. Please try again.";
        if (message === "Payment was cancelled") {
          toast.info(message);
        } else {
          showUserFacingErrorToast(
            error,
            "We could not process the upgrade. Please try again.",
            "payment",
          );
        }
        throw error;
      } finally {
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [
      token,
      openCheckout,
      setTier,
      invalidateSubscriptionQueries,
      onSuccess,
      user,
    ],
  );

  return { checkoutTier, isProcessing, processingId };
}
