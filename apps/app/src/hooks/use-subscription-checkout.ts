import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  isPaymentCanceledError,
  notifyPaymentCanceled,
  type RazorpayResponse,
  useRazorpay,
} from "@/hooks/use-razorpay";
import { PaymentFailedError } from "@/hooks/razorpay-checkout-errors";
import { useAuth } from "@/lib/auth/auth-context";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { BRAND_FOREGROUND_HEX } from "@/lib/constants/branding";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { queryKeys } from "@workspace/data-access";
import { type PlanMode, type TierName } from "@workspace/types";
import {
  activateSubscription,
  createSubscriptionCheckout,
} from "@/features/subscription/api/subscription.api";

export interface CheckoutSuccessData {
  planName: string;
  amount?: number;
  transactionId?: string;
}

export interface TierCheckoutParams {
  tier: TierName;
  billingCycle: "MONTHLY" | "YEARLY";
  /** Optional plan mode (Full / Front Desk / Core). Defaults to FULL on the API. */
  planMode?: PlanMode;
}

export function useSubscriptionCheckout(
  onSuccess: (data: CheckoutSuccessData) => void,
) {
  const { token, user } = useAuth();
  const clinicContext = useOptionalClinic();
  const { setTier, setMode } = usePermissionStore();
  const queryClient = useQueryClient();
  const { openCheckout, closeCheckout, isCheckoutOpen } = useRazorpay();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const checkoutInFlightRef = useRef(false);

  const invalidateSubscriptionQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.status() }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.clinic.subscriptionSettings(),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.billingHistory.all() }),
      clinicContext?.refreshClinic(),
    ]);
  }, [clinicContext, queryClient]);

  const checkoutTier = useCallback(
    async ({
      tier,
      billingCycle,
      planMode = "FULL",
    }: TierCheckoutParams) => {
      if (!token) {
        throw new Error("Please sign in to manage your subscription");
      }
      if (checkoutInFlightRef.current) {
        return;
      }
      checkoutInFlightRef.current = true;
      setIsProcessing(true);
      setProcessingId(`tier-${tier}`);

      try {
        const createData = await createSubscriptionCheckout({
          tier,
          billingCycle,
          planMode,
        });
        const {
          orderId,
          amountCents,
          currency,
          razorpayKeyId,
        } = createData;
        const completedWithoutPayment =
          "completedWithoutPayment" in createData &&
          createData.completedWithoutPayment === true;

        if (completedWithoutPayment) {
          setTier(tier);
          setMode(planMode);
          await invalidateSubscriptionQueries();
          onSuccess({
            planName: `${tier} Plan`,
            amount: 0,
          });
          return;
        }

        if (!orderId || !amountCents || !currency || !razorpayKeyId) throw new Error("We could not start checkout right now. Please try again.");

        const checkoutResult = await openCheckout({
          key: razorpayKeyId,
          amount: amountCents,
          currency,
          name: "Docita Subscription",
          description: `Upgrade to ${tier} Plan`,
          order_id: orderId,
          handler: async (response: RazorpayResponse) => {
            await activateSubscription({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              tier,
              billingCycle,
              planMode,
            });

            setTier(tier);
            await invalidateSubscriptionQueries();
            onSuccess({
              planName: `${tier} Plan`,
              amount: amountCents ? amountCents / 100 : undefined,
              transactionId: response.razorpay_payment_id,
            });
          },
          prefill: {
            name:
              createData.prefill?.name ?? user?.name ?? "Clinic Admin",
            email: createData.prefill?.email ?? user?.email ?? "",
            ...(createData.prefill?.contact
              ? { contact: createData.prefill.contact }
              : {}),
          },
          theme: { color: BRAND_FOREGROUND_HEX },
        });

        if (checkoutResult.status === "canceled") {
          return;
        }
        if (checkoutResult.status === "failed") {
          showUserFacingErrorToast(
            new PaymentFailedError(),
            "We could not complete this payment. Please try again.",
            "payment",
          );
          return;
        }
      } catch (error: unknown) {
        if (isPaymentCanceledError(error)) {
          notifyPaymentCanceled();
          return;
        }
        const apiMessage =
          error instanceof Error && error.message
            ? error.message
            : "We could not finish this plan change. Please try again.";
        showUserFacingErrorToast(error, apiMessage, "payment");
        throw error;
      } finally {
        checkoutInFlightRef.current = false;
        setIsProcessing(false);
        setProcessingId(null);
      }
    },
    [
      token,
      openCheckout,
      setTier,
      setMode,
      invalidateSubscriptionQueries,
      onSuccess,
      user,
    ],
  );

  return {
    checkoutTier,
    isProcessing,
    processingId,
    closeCheckout,
    isCheckoutOpen,
  };
}
