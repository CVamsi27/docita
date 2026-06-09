"use client";

import { useState } from "react";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { useResolveSubscriptionPayment } from "@/features/subscription/hooks/use-resolve-subscription-payment";
import type { SubscriptionCurrentResponse } from "@workspace/types";

export function useCheckoutFlow(
  subscription: SubscriptionCurrentResponse | null | undefined,
) {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<CheckoutSuccessData>({
    planName: "",
  });
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);

  const {
    checkoutTier,
    isProcessing: isCheckoutProcessing,
    closeCheckout,
    isCheckoutOpen,
  } = useSubscriptionCheckout((data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
  });

  const {
    resolvePayment,
    isResolving: isResolvePaymentProcessing,
    hasRecoverablePayment,
    recoverablePayment,
    isBillingHistoryLoading,
  } = useResolveSubscriptionPayment({
    subscription,
    checkoutTier,
    isCheckoutProcessing,
  });

  return {
    checkoutTier,
    closeCheckout,
    isCheckoutOpen,
    isProcessing: isCheckoutProcessing || isResolvePaymentProcessing,
    resolvePayment,
    hasRecoverablePayment,
    recoverablePayment,
    isBillingHistoryLoading,
    showSuccessModal,
    setShowSuccessModal,
    successData,
    showContactSalesModal,
    setShowContactSalesModal,
  };
}
