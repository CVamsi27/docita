"use client";

import { useState } from "react";
import { ShieldCheck, CreditCard, Loader2, Info } from "lucide-react";
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
import { toast } from "sonner";
import { api } from "@/lib/api-client";

interface PaymentDetails {
  autoPay: boolean;
  addons: {
    intelligence: boolean;
  };
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

interface PaymentStepProps {
  onComplete: (paymentDetails: PaymentDetails) => void;
  onBack: () => void;
  selectedPlanPrice: number;
  billingCycle: "MONTHLY" | "YEARLY";
  currencySymbol: string;
  planId?: string;
  clinicEmail?: string;
  clinicPhone?: string;
  tier?: string;
  onStartTrial?: () => void;
  intelligencePricing?: { monthly: number; yearly: number };
}


export function PaymentStep({
  onComplete,
  onBack,
  selectedPlanPrice,
  billingCycle,
  currencySymbol,
  planId,
  clinicEmail,
  clinicPhone,
  tier,
  onStartTrial,
  intelligencePricing,
}: PaymentStepProps) {
  const [autoPay, setAutoPay] = useState(true);
  const [intelligenceAddon, setIntelligenceAddon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const intelligencePrice =
    intelligencePricing
      ? billingCycle === "YEARLY"
        ? intelligencePricing.yearly
        : intelligencePricing.monthly
      : billingCycle === "YEARLY"
        ? 29990
        : 2999;

  const calculateTotal = () => {
    let total = selectedPlanPrice;
    if (intelligenceAddon) total += intelligencePrice;
    return total;
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
      onComplete({
        autoPay,
        addons: { intelligence: intelligenceAddon },
      });
      return;
    }

    setIsProcessing(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Payment system unavailable. Please check your connection.");
        setIsProcessing(false);
        return;
      }

      // Create order on backend
      let order: { id: string; amount: number; currency: string };
      try {
        order = await api.post<{ id: string; amount: number; currency: string }>(
          "/payments/create-order",
          {
            amount: total,
            planId,
            addons: { intelligence: intelligenceAddon },
          },
        );
      } catch {
        // If create-order fails in dev/trial, proceed without payment
        onComplete({
          autoPay,
          addons: { intelligence: intelligenceAddon },
        });
        return;
      }

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        // No key in dev environment - proceed without payment
        onComplete({
          autoPay,
          addons: { intelligence: intelligenceAddon },
        });
        return;
      }

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Docita",
        description: `Subscription - ${billingCycle === "YEARLY" ? "Yearly" : "Monthly"}`,
        order_id: order.id,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.post("/payments/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            onComplete({
              autoPay,
              addons: { intelligence: intelligenceAddon },
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            });
          } catch {
            toast.error("Payment verification failed. Please contact support.");
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
        toast.error("Payment system unavailable. Please refresh and try again.");
        setIsProcessing(false);
        return;
      }
      const rzp = new RazorpayWidget(options);
      rzp.on?.("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setIsProcessing(false);
      });
      rzp.open();
    } catch {
      toast.error("Unable to initiate payment. Please try again.");
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
            ? "Your selected plan has no upfront cost."
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

          {/* Add-ons */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-medium">Recommended Add-ons</h3>

            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/50">
              <Checkbox
                id="intelligence"
                checked={intelligenceAddon}
                onCheckedChange={(c) => setIntelligenceAddon(!!c)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="intelligence"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Docita Intelligence (AI)
                </Label>
                <p className="text-xs text-muted-foreground">
                  AI diagnosis assist, smart notes, and predictive insights.
                </p>
                <p className="text-sm font-semibold mt-1">
                  +{currencySymbol}
                  {intelligencePrice.toLocaleString()}/
                  {billingCycle === "YEARLY" ? "year" : "month"}
                </p>
              </div>
            </div>
          </div>

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

          {tier === "CORE" && onStartTrial && (
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
