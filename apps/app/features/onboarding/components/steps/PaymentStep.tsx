"use client";

import { useState } from "react";
import { CreditCard, Loader2, Info, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  Alert,
  AlertDescription,
} from "@workspace/ui/components/alert";
import { api } from "@/lib/api-client";
import { getSupportContactText } from "@/lib/support-contact";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import type { TierName } from "@workspace/types";

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
  onStartTrial?: () => void;
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
  onStartTrial,
}: PaymentStepProps) {
  const [autoPay, setAutoPay] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateTotal = () => {
    return selectedPlanPrice;
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
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
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showUserFacingErrorToast(
          "We could not open payments. Please check your connection and try again.",
        );
        setIsProcessing(false);
        return;
      }

      const resolvedTier = (tier ?? planId) as TierName | undefined;
      if (!resolvedTier) {
        showUserFacingErrorToast(
          "We could not identify the plan tier. Please go back and reselect the plan.",
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

      const options = {
        key: checkout.razorpayKeyId,
        amount: checkout.amountCents,
        currency: checkout.currency || currencyCode || "INR",
        name: "Docita",
        description: `Subscription - ${billingCycle === "YEARLY" ? "Yearly" : "Monthly"}`,
        order_id: checkout.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
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
          } catch {
            showUserFacingErrorToast(
              `We could not activate your subscription. Please ${getSupportContactText()}.`,
            );
            setIsProcessing(false);
          }
        },
        prefill: {
          email: clinicEmail,
          contact: clinicPhone,
        },
        theme: { color: "#3b82f6" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const RazorpayWidget = window.Razorpay;
      if (!RazorpayWidget) {
        showUserFacingErrorToast(
          "We could not open payments. Please refresh and try again.",
        );
        setIsProcessing(false);
        return;
      }
      const rzp = new RazorpayWidget(options);
      rzp.on?.("payment.failed", () => {
        showUserFacingErrorToast("We could not complete this payment. Please try again.");
        setIsProcessing(false);
      });
      rzp.open();
    } catch {
      showUserFacingErrorToast("We could not start payment right now. Please try again.");
      setIsProcessing(false);
    }
  };

  const total = calculateTotal();
  const isFree = total === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          {isFree
            ? "Your selected plan has no upfront cost"
            : "Complete payment to activate your subscription. You won't be charged until your trial ends."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Payments are processed securely through Razorpay. Your card details
              are never stored on our servers.
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
            <span className="text-xl font-bold">
              {isFree ? "Free" : `${currencySymbol}${total.toLocaleString()}`}
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
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

          {tier === "ESSENTIAL" && onStartTrial && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Not ready to pay?
              </p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={onStartTrial}
                disabled={isProcessing}
              >
                Start 14-day free trial instead →
              </Button>
            </div>
          )}

          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            <span>Secure payment via Razorpay · 256-bit SSL Encrypted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
