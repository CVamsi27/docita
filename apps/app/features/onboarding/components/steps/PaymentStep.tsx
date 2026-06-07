"use client";

// jscpd:ignore-start
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { api } from "@/lib/api/api-client";
import { getSupportContactText } from "@/lib/constants/support-contact";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  isPaymentCanceledError,
// jscpd:ignore-end
  notifyPaymentCanceled,
  useRazorpay,
} from "@/hooks/use-razorpay";
import { BRAND_PRIMARY_HEX } from "@/lib/constants/branding";
import { tierSchema } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import {
  PaymentSecurityAlerts,
  PaymentAutoPayField,
  PaymentTotalSummary,
  PaymentActionGroup,
  PaymentSecurityFooter,
} from "./PaymentStepSections";

interface PaymentDetails {
  autoPay: boolean;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

interface PaymentStepProps {
  onComplete: (paymentDetails: PaymentDetails) => void;
  onBack: () => void;
  selectedPlanPrice: number;
  billingCycle: "MONTHLY" | "YEARLY";
  currencySymbol: string;
  currencyCode?: string;
  planId?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  tier?: string;
}

export function PaymentStep({
  onComplete,
  onBack,
  selectedPlanPrice,
  billingCycle,
  currencySymbol,
  currencyCode,
  planId,
  clinicEmail,
  clinicPhone,
  tier,
}: PaymentStepProps) {
  const [autoPay, setAutoPay] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { openCheckout } = useRazorpay();

  const calculateTotal = () => {
    return selectedPlanPrice;
  };

  const handlePayment = async () => {
    const total = calculateTotal();

    // For free/trial plans, skip payment entirely
    if (total === 0) {
      onComplete({ autoPay });
      return;
    }

    setIsProcessing(true);

    try {
      const resolvedTier =
        parseStringEnumMember(
          tierSchema.options,
          String(tier ?? planId ?? ""),
        ) ?? undefined;
      if (!resolvedTier) {
        showUserFacingErrorToast(
          "We could not identify the plan tier. Please go back and reselect the plan.",
        );
        setIsProcessing(false);
        return;
      }

      if (resolvedTier === "ENTERPRISE") {
        showUserFacingErrorToast(
          "Enterprise plans require a sales consultation. Please contact support to proceed.",
        );
        setIsProcessing(false);
        return;
      }

      // Use the canonical subscription billing checkout endpoint (creates Razorpay order).
      const checkout = await api.post<{
        orderId: string;
        amountCents: number;
        currency: string;
        razorpayKeyId: string;
      }>("/subscription/billing/checkout", {
        tier: resolvedTier,
        billingCycle,
      });

      const checkoutResult = await openCheckout({
        key: checkout.razorpayKeyId,
        amount: checkout.amountCents,
        currency: checkout.currency || currencyCode || "INR",
        name: "Docita",
        description: `Subscription - ${billingCycle === "YEARLY" ? "Yearly" : "Monthly"}`,
        order_id: checkout.orderId,
        handler: async (response) => {
          await api.post("/subscription/billing/activate", {
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            tier: resolvedTier,
            billingCycle,
          });

          onComplete({
            autoPay,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
          });
        },
        prefill: {
          email: clinicEmail,
          contact: clinicPhone,
        },
        theme: { color: BRAND_PRIMARY_HEX },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      });

      if (checkoutResult.status === "canceled") {
        return;
      }
      if (checkoutResult.status === "failed") {
        showUserFacingErrorToast(
          undefined,
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
      showUserFacingErrorToast(
        error,
        `We could not start payment right now. Please ${getSupportContactText()}.`,
        "payment",
      );
      setIsProcessing(false);
    }
  };

  const total = calculateTotal();
  const isFree = total === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment details</CardTitle>
        <CardDescription>
          {isFree
            ? "Your selected plan has no upfront cost"
            : "Complete payment to activate your subscription."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <PaymentSecurityAlerts currencyCode={currencyCode} />
          <PaymentAutoPayField
            autoPay={autoPay}
            onAutoPayChange={setAutoPay}
          />
          <PaymentTotalSummary
            total={total}
            currencySymbol={currencySymbol}
            isFree={isFree}
          />
          <PaymentActionGroup
            isProcessing={isProcessing}
            isFree={isFree}
            onPay={handlePayment}
            onBack={onBack}
          />
          <PaymentSecurityFooter />
        </div>
      </CardContent>
    </Card>
  );
}
