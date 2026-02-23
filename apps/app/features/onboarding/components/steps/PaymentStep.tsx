"use client";

import { useState } from "react";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";

interface PaymentDetails {
  cardNumber: string;
  autoPay: boolean;
  addons: {
    intelligence: boolean;
  };
}

interface PaymentStepProps {
  onComplete: (paymentDetails: PaymentDetails) => void;
  onBack: () => void;
  selectedPlanPrice: number;
  billingCycle: "MONTHLY" | "YEARLY";
  currencySymbol: string;
}

interface PaymentFormErrors {
  nameOnCard?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
}

export function PaymentStep({
  onComplete,
  onBack,
  selectedPlanPrice,
  billingCycle,
  currencySymbol,
}: PaymentStepProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [nameOnCard, setNameOnCard] = useState("");
  const [autoPay, setAutoPay] = useState(true);
  const [formErrors, setFormErrors] = useState<PaymentFormErrors>({});

  // Add-ons state
  const [intelligenceAddon, setIntelligenceAddon] = useState(false);

  const intelligencePrice = billingCycle === "YEARLY" ? 29990 : 2999;

  const calculateTotal = () => {
    let total = selectedPlanPrice;
    if (intelligenceAddon) total += intelligencePrice;
    return total;
  };

  const validatePaymentForm = (): PaymentFormErrors => {
    const errors: PaymentFormErrors = {};
    const normalizedCardNumber = cardNumber.replace(/\s+/g, "");

    if (nameOnCard.trim().length < 2) {
      errors.nameOnCard = "Name on card is required";
    }

    if (!/^\d{13,19}$/.test(normalizedCardNumber)) {
      errors.cardNumber = "Enter a valid card number";
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim())) {
      errors.expiry = "Use MM/YY format";
    }

    if (!/^\d{3,4}$/.test(cvc.trim())) {
      errors.cvc = "Enter a valid CVC";
    }

    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validatePaymentForm();
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onComplete({
      cardNumber: cardNumber.slice(-4), // Only store last 4 for demo
      autoPay,
      addons: {
        intelligence: intelligenceAddon,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <CardDescription>
          Securely save your payment method. You won&apos;t be charged until
          your trial ends.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Add-ons Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-medium">Recommended Add-ons</h3>

            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/20">
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
                  {intelligencePrice}/
                  {billingCycle === "YEARLY" ? "year" : "month"}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name on Card</Label>
              <Input
                id="name"
                placeholder="Dr. John Doe"
                value={nameOnCard}
                onChange={(e) => {
                  setNameOnCard(e.target.value);
                  if (formErrors.nameOnCard) {
                    setFormErrors((prev) => ({
                      ...prev,
                      nameOnCard: undefined,
                    }));
                  }
                }}
                aria-invalid={!!formErrors.nameOnCard}
                aria-describedby={
                  formErrors.nameOnCard ? "payment-name-error" : undefined
                }
              />
              {formErrors.nameOnCard && (
                <p id="payment-name-error" className="text-sm text-destructive">
                  {formErrors.nameOnCard}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="number">Card Number</Label>
              <div className="relative">
                <Input
                  id="number"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => {
                    setCardNumber(e.target.value);
                    if (formErrors.cardNumber) {
                      setFormErrors((prev) => ({
                        ...prev,
                        cardNumber: undefined,
                      }));
                    }
                  }}
                  className="pl-10"
                  aria-invalid={!!formErrors.cardNumber}
                  aria-describedby={
                    formErrors.cardNumber ? "payment-card-error" : undefined
                  }
                />
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              {formErrors.cardNumber && (
                <p id="payment-card-error" className="text-sm text-destructive">
                  {formErrors.cardNumber}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => {
                    setExpiry(e.target.value);
                    if (formErrors.expiry) {
                      setFormErrors((prev) => ({ ...prev, expiry: undefined }));
                    }
                  }}
                  aria-invalid={!!formErrors.expiry}
                  aria-describedby={
                    formErrors.expiry ? "payment-expiry-error" : undefined
                  }
                />
                {formErrors.expiry && (
                  <p
                    id="payment-expiry-error"
                    className="text-sm text-destructive"
                  >
                    {formErrors.expiry}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvc">CVC</Label>
                <div className="relative">
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => {
                      setCvc(e.target.value);
                      if (formErrors.cvc) {
                        setFormErrors((prev) => ({ ...prev, cvc: undefined }));
                      }
                    }}
                    className="pl-10"
                    aria-invalid={!!formErrors.cvc}
                    aria-describedby={
                      formErrors.cvc ? "payment-cvc-error" : undefined
                    }
                  />
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
                {formErrors.cvc && (
                  <p
                    id="payment-cvc-error"
                    className="text-sm text-destructive"
                  >
                    {formErrors.cvc}
                  </p>
                )}
              </div>
            </div>
          </div>

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

          <div className="bg-primary/5 p-4 rounded-lg flex items-center justify-between">
            <span className="font-semibold">Total Due Today:</span>
            <span className="text-xl font-bold">
              {currencySymbol}
              {calculateTotal().toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button type="submit" className="w-full">
              Complete Payment & Continue
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              Back
            </Button>
          </div>

          <div className="flex justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            <span>Secure 256-bit SSL Encrypted Payment</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
