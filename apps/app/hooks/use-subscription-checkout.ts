import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type RazorpayResponse, useRazorpay } from "@/hooks/use-razorpay";
import { useAuth } from "@/lib/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
import type { TierName } from "@workspace/types";
import { API_URL } from "@/lib/api-config";

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
      queryClient.invalidateQueries({ queryKey: ["subscription"] }),
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
        const createRes = await fetch(
          `${API_URL}/subscription/billing/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ tier, billingCycle }),
          },
        );
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.message || "Failed to initiate checkout");
        }

        const { orderId, amountCents, currency, razorpayKeyId } = createData;

        await openCheckout({
          key: razorpayKeyId as string,
          amount: amountCents as number,
          currency: currency as string,
          name: "Docita Subscription",
          description: `Upgrade to ${tier} Plan`,
          order_id: orderId as string,
          handler: async (response: RazorpayResponse) => {
            const activateRes = await fetch(
              `${API_URL}/subscription/billing/activate`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature,
                  tier,
                  billingCycle,
                }),
              },
            );
            const activateData = await activateRes.json();
            if (!activateRes.ok) {
              throw new Error(activateData.message || "Activation failed");
            }

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
          error instanceof Error ? error.message : "Failed to process upgrade";
        if (message === "Payment was cancelled") {
          toast.info(message);
        } else {
          toast.error(message);
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
