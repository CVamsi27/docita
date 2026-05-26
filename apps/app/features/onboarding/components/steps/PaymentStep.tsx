"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useState } from "react";
import { CreditCard, Info, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Checkbox } from "@workspace/ui/components/form/checkbox";
import { Label } from "@workspace/ui/components/form/label";
import {
  Alert,
  AlertDescription,
} from "@workspace/ui/components/alert";
import { api } from "@/lib/api/api-client";
import { getSupportContactText } from "@/lib/support-contact";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { isPaymentCanceledError, useRazorpay } from "@/hooks/use-razorpay";
import { BRAND_PRIMARY_HEX } from "@/lib/branding";
import type { TierName } from "@workspace/types";
import { formatAmountLocale } from "@workspace/utils";

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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Payments are processed securely through Razorpay. Your card
              details are never stored on our servers.
            </AlertDescription>
          </Alert>

          {currencyCode === "INR" && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                GST invoices are issued using the GSTIN saved in Clinic Details
                before any paid Indian plan is charged.
              </AlertDescription>
            </Alert>
          )}

          {/* Auto-pay */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autopay"
              checked={autoPay}
              onCheckedChange={(c) => setAutoPay(!!c)}
            />
            <Label htmlFor="autopay" className="text-sm font-normal">
              Enable Auto-pay for uninterrupted service
            </Label>
          </div>

          {/* Total */}
          <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
            <span className="font-semibold">Total Due Today:</span>
            <span className="ui-section-title text-[var(--fs-2xl)] leading-none tabular-nums">
              {isFree
                ? "Free"
                : `${currencySymbol}${formatAmountLocale(total, "en-IN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}`}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                  Processing…
                </>
              ) : isFree ? (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Continue (No Payment Required)
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Complete Payment & Continue
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full"
              disabled={isProcessing}
            >
              Back
            </Button>
          </div>

          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            <span>Secure payment via Razorpay · 256-bit SSL Encrypted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
