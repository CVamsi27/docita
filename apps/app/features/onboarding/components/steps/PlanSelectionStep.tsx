"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";

interface PlanSelectionProps {
  onSelect: (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
  ) => void;
  defaultTier?: string;
  defaultBillingCycle?: "MONTHLY" | "YEARLY";
  currency?: string;
}

// Tiers to display (exclude INTELLIGENCE add-on)
const DISPLAY_TIERS = ["CAPTURE", "CORE", "PLUS", "PRO", "ENTERPRISE"];

export function PlanSelectionStep({
  onSelect,
  defaultTier = "CAPTURE",
  defaultBillingCycle = "MONTHLY",
  currency = "INR",
}: PlanSelectionProps) {
  const [selectedTier, setSelectedTier] = useState<string>(defaultTier);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultBillingCycle,
  );

  // Fetch pricing from backend
  const { pricingConfig, isLoading, error } = usePricingConfig(currency);

  const handleSelect = () => {
    const tierData = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === selectedTier,
    );
    if (tierData) {
      onSelect(selectedTier, billingCycle, tierData.pricing);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading pricing...</span>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !pricingConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Unable to load pricing. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { tiers, currency: currencyInfo, discounts } = pricingConfig;

  // Filter to display tiers only
  const displayTiers = tiers.filter((t) => DISPLAY_TIERS.includes(t.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your Plan</CardTitle>
        <CardDescription>
          Select a plan that fits your clinic needs. You can upgrade anytime.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Billing Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={billingCycle === "MONTHLY" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("MONTHLY")}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === "YEARLY" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("YEARLY")}
            >
              Yearly{" "}
              <Badge variant="secondary" className="ml-1">
                Save {discounts.annualPercent}%
              </Badge>
            </Button>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTiers.map((tier: TierPricing) => {
            const isSelected = selectedTier === tier.id;
            const isFree = tier.id === "CAPTURE";
            const isCustom =
              tier.pricing.monthly === "custom" ||
              tier.pricing.yearly === "custom";

            const displayPrice =
              billingCycle === "YEARLY"
                ? tier.pricing.yearly
                : tier.pricing.monthly;

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  "relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted hover:border-muted-foreground/30",
                )}
              >
                {tier.id === "PLUS" && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-linear-to-r from-emerald-500 to-emerald-600">
                    Most Popular
                  </Badge>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {tier.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  {isFree ? (
                    <div className="text-2xl font-bold">Free</div>
                  ) : isCustom ? (
                    <div className="text-2xl font-bold">Contact Us</div>
                  ) : (
                    <div>
                      <span className="text-2xl font-bold">
                        {currencyInfo.symbol}
                        {typeof displayPrice === "number"
                          ? displayPrice.toLocaleString()
                          : displayPrice}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        /{billingCycle === "YEARLY" ? "year" : "month"}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground italic">
                  {tier.tagline}
                </p>
              </div>
            );
          })}
        </div>

        <Button onClick={handleSelect} className="w-full" size="lg">
          Continue with{" "}
          {displayTiers.find((t: TierPricing) => t.id === selectedTier)?.name ||
            "Selected"}{" "}
          Plan
        </Button>
      </CardContent>
    </Card>
  );
}
