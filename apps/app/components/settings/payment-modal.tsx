"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

// Type-safe Razorpay accessor
function getRazorpay(): { new (options: RazorpayOptions): RazorpayInstance } {
  return (
    window as unknown as {
      Razorpay: { new (options: RazorpayOptions): RazorpayInstance };
    }
  ).Razorpay;
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [amountCents, setAmountCents] = useState<number>(10000); // Default 100 INR
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const API_URL = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001";

  // Load Razorpay script
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    if (amountCents < 10000) {
      setError("Minimum payment amount is ₹100");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create checkout
      const checkoutRes = await fetch(
        `${API_URL}/subscription/billing/make-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amountCents,
            description,
          }),
        },
      );

      if (!checkoutRes.ok) {
        throw new Error("Failed to create payment");
      }

      const { orderId, currency, razorpayKeyId } = await checkoutRes.json();

      // Open Razorpay checkout
      const options = {
        key: razorpayKeyId,
        amount: amountCents,
        currency,
        order_id: orderId,
        name: "Docita",
        description: description || "Payment toward subscription",
        handler: () => {
          // On success
          setAmountCents(10000);
          setDescription("");
          onSuccess();
          onClose();
        },
        prefill: {
          name: "Clinic",
          email: "clinic@example.com",
        },
        theme: {
          color: "#0EA5E9",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      const Razorpay = getRazorpay();
      const razorpay = new Razorpay(options as RazorpayOptions);
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setIsLoading(false);
    }
  };

  const amountINR = (amountCents / 100).toFixed(2);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Make an immediate payment toward your subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">₹</span>
              <Input
                id="amount"
                type="number"
                min={100}
                step={100}
                value={amountINR}
                onChange={(e) =>
                  setAmountCents(Math.round(parseFloat(e.target.value) * 100))
                }
                className="text-lg"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum amount: ₹100
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Advance payment for next quarter"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold">₹{amountINR}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isLoading || amountCents < 10000}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Pay Now"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
