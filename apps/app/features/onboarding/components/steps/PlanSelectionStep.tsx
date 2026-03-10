"use client";

import { useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";

interface PlanSelectionProps {
  onSelect: (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: { isCoreTrial?: boolean },
  ) => Promise<void>;
  defaultTier?: string;
  defaultBillingCycle?: "MONTHLY" | "YEARLY";
  defaultIsCoreTrial?: boolean;
  currency?: string;
}

const DISPLAY_TIERS = ["CAPTURE", "CORE", "PLUS", "PRO", "ENTERPRISE"];

const PLAN_AUDIENCE: Record<string, string> = {
  CAPTURE: "Best for clinics moving from paper to digital",
  CORE: "Best for small clinics running daily OPD",
  PLUS: "Best for growing clinics with multiple workflows",
  PRO: "Best for multi-doctor clinics needing advanced controls",
  ENTERPRISE: "Best for hospitals and chains with custom requirements",
};

export function PlanSelectionStep({
  onSelect,
  defaultTier = "CAPTURE",
  defaultBillingCycle = "MONTHLY",
  defaultIsCoreTrial = false,
  currency = "INR",
}: PlanSelectionProps) {
  const [selectedTier, setSelectedTier] = useState<string>(defaultTier);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultBillingCycle,
  );
  const [isCoreTrial, setIsCoreTrial] = useState(defaultIsCoreTrial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);

  const { pricingConfig, isLoading, error } = usePricingConfig(currency);

  const handleSelect = async () => {
    const tierData = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === selectedTier,
    );
    if (tierData) {
      setIsSubmitting(true);
      try {
        await onSelect(selectedTier, billingCycle, tierData.pricing, {
          isCoreTrial,
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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

  const displayTiers = tiers.filter((t) => DISPLAY_TIERS.includes(t.id));
  const selectedTierData = displayTiers.find((t) => t.id === selectedTier);
  const isEnterpriseSelected = selectedTier === "ENTERPRISE";

  const hasCoreTrialOption = selectedTier === "CORE";
  const effectivePriceLabel =
    isEnterpriseSelected
      ? "Contact Sales to Continue"
      : hasCoreTrialOption && isCoreTrial
        ? "Start 14-day free trial"
        : `Continue with ${selectedTierData?.name || "Selected"} Plan`;
  const selectedPrice =
    billingCycle === "YEARLY"
      ? selectedTierData?.pricing.yearly
      : selectedTierData?.pricing.monthly;
  const selectedPriceLabel =
    selectedPrice === undefined
      ? "-"
      : selectedPrice === "custom"
        ? "Custom"
        : `${currencyInfo.symbol}${selectedPrice.toLocaleString()}/${billingCycle === "YEARLY" ? "year" : "month"}`;

  const enterpriseContactMessage = `Hi Docita Sales Team,

I am interested in the Enterprise plan from onboarding.

Selected tier: ${selectedTierData?.name || "Enterprise"}
Billing preference: ${billingCycle}

Please contact me with deployment and commercial details.`;

  return (
    <Card className="border-primary/20 bg-linear-to-br from-background via-background to-primary/5">
      <CardHeader>
        <CardTitle>Step 2: Choose Your Plan</CardTitle>
        <CardDescription>
          Select a plan that fits your clinic needs. Paid plans redirect to
          Razorpay for secure checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Plan Selection Guide</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a tier based on expected patient volume, team size, and
            required automation. You can upgrade anytime from billing.
          </p>
        </div>

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

        <div className="grid gap-4 lg:grid-cols-[2fr_1fr] lg:items-start">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={cn(
                    "relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-muted bg-card hover:border-muted-foreground/30",
                  )}
                >
                  {tier.id === "PLUS" && (
                    <Badge className="absolute -top-2 left-3 bg-linear-to-r from-success to-success">
                      Popular
                    </Badge>
                  )}

                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{tier.name}</h3>
                      <p className="text-sm text-muted-foreground">{PLAN_AUDIENCE[tier.id]}</p>
                    </div>
                    {isSelected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    {isFree ? (
                      <span className="text-2xl font-bold">Free</span>
                    ) : isCustom ? (
                      <span className="text-2xl font-bold">Custom</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold">
                          {currencyInfo.symbol}
                          {typeof displayPrice === "number"
                            ? displayPrice.toLocaleString()
                            : displayPrice}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /{billingCycle === "YEARLY" ? "year" : "month"}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="mb-2 text-xs text-muted-foreground">
                    {tier.limits?.storage ?? "-"} GB storage included
                  </p>

                  {Array.isArray(tier.features) && tier.features.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {tier.features.slice(0, 4).map((feature) => (
                        <li key={`${tier.id}-${feature}`}>• {feature}</li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border bg-card p-4 lg:sticky lg:top-4">
            <h4 className="text-sm font-semibold">Selected Plan</h4>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {selectedTierData?.name || selectedTier}
            </p>
            <p className="text-sm text-muted-foreground">{selectedPriceLabel}</p>

            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>
                Patients: <span className="font-medium text-foreground">{selectedTierData?.limits?.patients ?? "-"}</span>
              </p>
              <p>
                Users: <span className="font-medium text-foreground">{selectedTierData?.limits?.users ?? "-"}</span>
              </p>
              <p>
                Storage: <span className="font-medium text-foreground">{selectedTierData?.limits?.storage ?? "-"} GB</span>
              </p>
              <p>
                Appointments/mo: <span className="font-medium text-foreground">{selectedTierData?.limits?.appointments ?? "-"}</span>
              </p>
            </div>

            {hasCoreTrialOption && (
              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="core-trial"
                    checked={isCoreTrial}
                    onCheckedChange={(checked) => setIsCoreTrial(Boolean(checked))}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="core-trial" className="font-medium">
                      14-day free trial for Core
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Start now and add payment later.
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    <Sparkles className="mr-1 h-3 w-3" /> 14 Days
                  </Badge>
                </div>
              </div>
            )}

            {isEnterpriseSelected && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <p>Enterprise plans are provisioned via sales.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={() => setShowContactSalesModal(true)}
                >
                  Contact Sales
                </Button>
              </div>
            )}

            <Button
              onClick={handleSelect}
              className="mt-4 w-full"
              size="lg"
              disabled={isSubmitting || isEnterpriseSelected}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Razorpay...
                </>
              ) : (
                effectivePriceLabel
              )}
            </Button>
          </div>
        </div>

        <ContactSalesModal
          open={showContactSalesModal}
          onOpenChange={setShowContactSalesModal}
          source="onboarding_enterprise"
          defaultValues={{
            message: enterpriseContactMessage,
          }}
        />
      </CardContent>
    </Card>
  );
}
