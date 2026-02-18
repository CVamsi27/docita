/**
 * useSubscriptionCheckout
 *
 * Encapsulates the full subscription payment flow:
 *   1. POST /subscription/billing/checkout → get Razorpay order
 *   2. Open Razorpay checkout
 *   3. POST /subscription/billing/activate → confirm payment
 *
 * Follows SRP: payment orchestration lives here, not in UI components.
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRazorpay } from "@/hooks/use-razorpay";
import { useAuth } from "@/lib/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
import type { TierName } from "@workspace/types";

export interface CheckoutSuccessData {
  planName: string;
  amount?: number;
  transactionId?: string;
  isAddon?: boolean;
}

interface TierCheckoutParams {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
}

interface AddonCheckoutParams {
  addonId: string;
  billingCycle: "MONTHLY" | "YEARLY";
  currentTier: number;
}

const apiUrl =
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

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
      if (!token) return;
      setIsProcessing(true);
      setProcessingId(`tier-${tier}`);

      try {
        const createRes = await fetch(
          `${apiUrl}/subscription/billing/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ tier, billingCycle, addOns: [] }),
          },
        );
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.message || "Failed to initiate checkout");
        }

        const { orderId, amountCents, currency, razorpayKeyId } = createData;

        await openCheckout({
          key: razorpayKeyId,
          amount: amountCents,
          currency,
          name: "Docita Subscription",
          description: `Upgrade to ${tier} Plan`,
          order_id: orderId,
          handler: async (response: unknown) => {
            const data = response as {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            };
            try {
              const activateRes = await fetch(
                `${apiUrl}/subscription/billing/activate`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    razorpayPaymentId: data.razorpay_payment_id,
                    razorpayOrderId: data.razorpay_order_id,
                    razorpaySignature: data.razorpay_signature,
                    tier,
                    billingCycle,
                    addOns: [],
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
                transactionId: data.razorpay_payment_id,
                isAddon: false,
              });
            } catch (err: unknown) {
              toast.error(
                err instanceof Error ? err.message : "Payment verification failed",
              );
            }
          },
          prefill: {
            name: user?.name || "Clinic Admin",
            email: user?.email || "",
          },
          theme: { color: "#0F172A" },
        });
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "Failed to process upgrade",
        );
      } finally {
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [token, openCheckout, setTier, invalidateSubscriptionQueries, onSuccess, user],
  );

  const checkoutAddon = useCallback(
    async ({ addonId, billingCycle, currentTier }: AddonCheckoutParams) => {
      if (!token) return;
      setIsProcessing(true);
      setProcessingId(addonId);

      try {
        const createRes = await fetch(
          `${apiUrl}/subscription/billing/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              billingCycle,
              addOns: [addonId],
              tier: currentTier,
            }),
          },
        );
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.message || "Failed to initiate checkout");
        }

        const { orderId, amountCents, currency, razorpayKeyId } = createData;

        await openCheckout({
          key: razorpayKeyId,
          amount: amountCents,
          currency,
          name: "Docita Subscription",
          description: `Add-on: ${addonId}`,
          order_id: orderId,
          handler: async (response: unknown) => {
            const data = response as {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            };
            try {
              const activateRes = await fetch(
                `${apiUrl}/subscription/billing/activate`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    razorpayPaymentId: data.razorpay_payment_id,
                    razorpayOrderId: data.razorpay_order_id,
                    razorpaySignature: data.razorpay_signature,
                    billingCycle,
                    addOns: [addonId],
                    tier: currentTier,
                  }),
                },
              );
              const activateData = await activateRes.json();
              if (!activateRes.ok) {
                throw new Error(activateData.message || "Activation failed");
              }

              await invalidateSubscriptionQueries();
              onSuccess({
                planName: addonId,
                amount: amountCents ? amountCents / 100 : undefined,
                transactionId: data.razorpay_payment_id,
                isAddon: true,
              });
            } catch (err: unknown) {
              toast.error(
                err instanceof Error ? err.message : "Payment verification failed",
              );
            }
          },
          prefill: {
            name: user?.name || "Clinic Admin",
            email: user?.email || "",
          },
          theme: { color: "#0F172A" },
        });
      } catch (error: unknown) {
        toast.error(
          error instanceof Error ? error.message : "Failed to process purchase",
        );
      } finally {
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [token, openCheckout, invalidateSubscriptionQueries, onSuccess, user],
  );

  return { checkoutTier, checkoutAddon, isProcessing, processingId };
}
