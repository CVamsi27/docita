"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import { TierCard } from "@/features/subscription/components/cards/tier-card";
import { ComparisonTable } from "@/features/subscription/components/pricing/comparison-table";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  getAllFeaturesUpToTier,
  PLAN_LIMITS,
  getTierInfo,
  Tier,
} from "@/lib/tier-config";
import {
  PRICING_CURRENCY_SYMBOLS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  type TierName,
} from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";

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

const DISPLAY_TIERS = ["STARTER", "ESSENTIAL", "PROFESSIONAL", "ENTERPRISE"];

const PLAN_AUDIENCE: Record<string, string> = {
  STARTER: "Best for solo doctors wanting to digitize their practice",
  ESSENTIAL: "Best for small clinics needing professional billing and analytics",
  PROFESSIONAL: "Best for multi-doctor clinics and growing practices",
  ENTERPRISE: "Best for hospitals and chains with custom requirements",
};

export function PlanSelectionStep({
  onSelect,
  defaultTier = "STARTER",
  defaultBillingCycle = "MONTHLY",
  defaultIsCoreTrial = false,
  currency,
}: PlanSelectionProps) {
  const { currency: detectedCurrency } = useLocaleCurrency();
  const [selectedTier, setSelectedTier] = useState<string>(defaultTier);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultBillingCycle,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const resolvedCurrency = currency ?? detectedCurrency;
  const { pricingConfig, isLoading, error } = usePricingConfig(resolvedCurrency);

  const featuresByTier = Object.values(Tier)
    .filter((t): t is Tier => typeof t === "number" && t !== Tier.INTELLIGENCE)
    .map((tier) => ({
      tier,
      info: {
        ...getTierInfo(tier),
        tagline: PLAN_AUDIENCE[Tier[tier] as string] ?? getTierInfo(tier).tagline,
      },
      features: getAllFeaturesUpToTier(Tier[tier] as TierName).map((feature) => ({
        feature,
        details: getFeatureDetails(feature),
        hasAccess: true,
      })),
    }));

  const handleSelectTier = async (tier: string) => {
    if (tier === "ENTERPRISE") {
      setShowContactSalesModal(true);
      return;
    }
    const tierPricingData = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === tier,
    );
    if (!tierPricingData) return;

    setIsSubmitting(true);
    try {
      await onSelect(tier, billingCycle, tierPricingData.pricing);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEssentialTrial = async () => {
    const tierPricingData = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === "ESSENTIAL",
    );
    if (!tierPricingData) return;

    setIsSubmitting(true);
    try {
      await onSelect("ESSENTIAL", billingCycle, tierPricingData.pricing, {
        isCoreTrial: true,
      });
    } finally {
      setIsSubmitting(false);
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

  const { discounts } = pricingConfig;

  const enterpriseContactMessage = `Hi Docita Sales Team,

I am interested in the Enterprise plan from onboarding.

Selected tier: Enterprise
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuresByTier
            .filter((t) => DISPLAY_TIERS.includes(Tier[t.tier] as string))
            .map(({ tier, info, features }) => {
              const tierName = Tier[tier] as TierName;
              const tierPricingData = pricingConfig.tiers.find(
                (t: TierPricing) => t.id === tierName,
              );
              const currencyKey = resolvedCurrency as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY;
              const currencySymbol = PRICING_CURRENCY_SYMBOLS[resolvedCurrency as keyof typeof PRICING_CURRENCY_SYMBOLS] ?? "₹";
              const overageRates =
                (TIER_OVERAGE_RATES_BY_CURRENCY[currencyKey] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR)[tierName];
              const overageHint =
                overageRates?.patientRate > 0
                  ? `then ${currencySymbol}${overageRates.patientRate}/extra patient`
                  : undefined;

              return (
                <div
                  key={tier}
                  className={cn(
                    "relative flex flex-col",
                    tierName === "ESSENTIAL" && "order-first md:order-none",
                  )}
                >
                  {tierName === "ESSENTIAL" && (
                    <Badge className="absolute -top-2 left-4 z-10 bg-success text-success-foreground">
                      Popular
                    </Badge>
                  )}
                  <TierCard
                    tier={tier}
                    info={info}
                    features={features}
                    isCurrentTier={false}
                    isLocked={false}
                    className={cn("h-full", selectedTier === tierName && "border-primary ring-2 ring-primary/20 shadow-lg")}
                    pricing={tierPricingData?.pricing}
                    billingCycle={billingCycle}
                    currencySymbol={currencySymbol}
                    overageHint={overageHint}
                    buttonLabel="Select Plan"
                    maxDisplay={8}
                    usageHints={PLAN_LIMITS[tierName as keyof typeof PLAN_LIMITS] ? {
                      patients: PLAN_LIMITS[tierName as keyof typeof PLAN_LIMITS].patients,
                      users: PLAN_LIMITS[tierName as keyof typeof PLAN_LIMITS].users,
                    } : undefined}
                    onSelect={
                      isSubmitting
                        ? undefined
                        : () => {
                            setSelectedTier(tierName);
                            handleSelectTier(tierName);
                          }
                    }
                  />
                </div>
              );
            })}
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                Not ready to pay yet? Try Essential free for 14 days
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                No payment required. Get full Essential access and add a payment method later.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={isSubmitting}
              onClick={handleStartEssentialTrial}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Skip – Start Free Trial"
              )}
            </Button>
          </div>
        </div>

        <Collapsible open={comparisonOpen} onOpenChange={setComparisonOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between border border-border/50 rounded-lg px-4 py-3 h-auto"
            >
              <span className="text-sm font-medium">Compare all plans</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  comparisonOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ComparisonTable currentTier={0} />
          </CollapsibleContent>
        </Collapsible>

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
