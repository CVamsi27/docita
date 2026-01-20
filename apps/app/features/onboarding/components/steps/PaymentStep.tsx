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
    whatsapp: boolean;
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

  // Add-ons state
  const [whatsappAddon, setWhatsappAddon] = useState(false);
  const [intelligenceAddon, setIntelligenceAddon] = useState(false);

  const whatsappPrice = billingCycle === "YEARLY" ? 7990 : 799;
  const intelligencePrice = billingCycle === "YEARLY" ? 29990 : 2999;

  const calculateTotal = () => {
    let total = selectedPlanPrice;
    if (whatsappAddon) total += whatsappPrice;
    if (intelligenceAddon) total += intelligencePrice;
    return total;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({
      cardNumber: cardNumber.slice(-4), // Only store last 4 for demo
      autoPay,
      addons: {
        whatsapp: whatsappAddon,
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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Add-ons Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="font-medium">Recommended Add-ons</h3>

            <div className="flex items-start space-x-3 p-3 border rounded-lg bg-muted/20">
              <Checkbox
                id="whatsapp"
                checked={whatsappAddon}
                onCheckedChange={(c) => setWhatsappAddon(!!c)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="whatsapp"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  WhatsApp Integration
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automated reminders & patient communication via WhatsApp.
                </p>
                <p className="text-sm font-semibold mt-1">
                  +{currencySymbol}
                  {whatsappPrice}/{billingCycle === "YEARLY" ? "year" : "month"}
                </p>
              </div>
            </div>

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
                onChange={(e) => setNameOnCard(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="number">Card Number</Label>
              <div className="relative">
                <Input
                  id="number"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="pl-10"
                  required
                />
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expiry">Expiry</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cvc">CVC</Label>
                <div className="relative">
                  <Input
                    id="cvc"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    className="pl-10"
                    required
                  />
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
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
