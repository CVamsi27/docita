"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import { type TierPricing, usePricingConfig } from "@/features/subscription/hooks/use-pricing";
import { ContactSalesModal } from "@/features/dialogs";
import { TierCard, getFeatureDetails } from "@/features/subscription";
import {
  getAllFeaturesUpToTier,
  PLAN_LIMITS,
  getTierInfo,
  getTierValue,
} from "@/lib/subscription/tier-access";
import { tierSchema, type TierName } from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription";
import {
  DISPLAY_TIERS,
  DISPLAY_TIER_GROUPS,
  PLAN_AUDIENCE,
  buildTierCardConfig,
  BillingCycleToggle,
  PlanComparisonCollapsible,
} from "./plan-selection-step-helpers";
import type { PlanSelectionProps } from "./PlanSelectionStep";

export function PlanSelectionStepInner({
  onSelect,
  defaultTier = "ESSENTIAL",
  defaultBillingCycle = "MONTHLY",
  currency,
}: PlanSelectionProps) {
  const searchParams = useSearchParams();
  const { currency: detectedCurrency } = useLocaleCurrency();
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    const parsedTier = tierSchema.safeParse(searchParams.get("tier"));
    if (parsedTier.success) return parsedTier.data;
    return defaultTier;
  });
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultBillingCycle,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const resolvedCurrency = currency ?? detectedCurrency;
  const { pricingConfig, isLoading, error } =
    usePricingConfig(resolvedCurrency);

  const featuresByTier = DISPLAY_TIERS.map((tierName) => {
    const tier = getTierValue(tierName);
    return {
      tierName,
      tier,
      info: {
        ...getTierInfo(tier),
        tagline: PLAN_AUDIENCE[tierName] ?? getTierInfo(tier).tagline,
      },
      features: getAllFeaturesUpToTier(tierName)
        .map((feature) => ({
          feature,
          details: getFeatureDetails(feature),
          hasAccess: true,
        }))
        .filter((entry) => entry.details.isGenerallyAvailable),
    };
  });

  const handleSelectTier = async (tier: string) => {
    if (tier === "ENTERPRISE") {
      setShowContactSalesModal(true);
      return;
    }
    const tierPricingFromApi = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === tier,
    );
    const parsedTier = tierSchema.safeParse(tier);
    if (!parsedTier.success) {
      return;
    }
    const { cardPricing } = buildTierCardConfig(
      parsedTier.data,
      resolvedCurrency,
      pricingConfig?.tiers ?? [],
    );
    const pricingPayload = tierPricingFromApi?.pricing ?? cardPricing;

    setIsSubmitting(true);
    try {
      await onSelect(tier, billingCycle, pricingPayload, {
        currency: resolvedCurrency,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent
          className="flex flex-col items-center justify-center gap-3 py-12 sm:flex-row"
          role="status"
          aria-live="polite"
          aria-label="Loading pricing"
        >
          <DocitaLoadingIndicator
            variant="section"
            withStatusRole={false}
            iconClassName="h-8 w-8 text-muted-foreground"
          />
          <span className="text-sm text-muted-foreground">
            Loading pricing…
          </span>
        </CardContent>
      </Card>
    );
  }

  if (error || !pricingConfig) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            We could not load pricing right now. Please try again shortly.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pricingRegionLabel =
    resolvedCurrency === "INR"
      ? "India-competitive pricing"
      : "Premium international pricing";

  const enterpriseContactMessage = `Hi Docita Sales Team,

I am interested in the Enterprise plan from onboarding.

Selected tier: Enterprise
Billing preference: ${billingCycle}

Please contact me with deployment and commercial details.`;

  const renderTierCard = (tierName: TierName) => {
    const tierConfig = featuresByTier.find((entry) => entry.tierName === tierName);
    if (!tierConfig) return null;
    const { tier, info, features } = tierConfig;
    const { cardPricing, currencySymbol, overageHint, buttonLabel } =
      buildTierCardConfig(tierName, resolvedCurrency, pricingConfig.tiers);

    return (
      <div
        key={tier}
        className={cn(
          "relative flex w-full max-w-[22rem] flex-col sm:max-w-[24rem]",
          tierName === "ESSENTIAL" && "order-first md:order-none",
        )}
      >
        {tierName === "ESSENTIAL" ? (
          <Badge className="absolute -top-2 left-4 z-10 bg-success text-success-foreground">
            Popular
          </Badge>
        ) : null}
        <TierCard
          tier={tier}
          info={info}
          features={features}
          isCurrentTier={false}
          isLocked={false}
          className={cn(
            "h-full",
            selectedTier === tierName &&
              "border-primary ring-2 ring-primary/20 shadow-lg",
          )}
          keyHighlights={PLAN_ONBOARDING_KEY_HIGHLIGHTS[tierName] ?? []}
          pricing={cardPricing}
          billingCycle={billingCycle}
          currencySymbol={currencySymbol}
          overageHint={overageHint}
          buttonLabel={buttonLabel}
          maxDisplay={8}
          usageHints={
            PLAN_LIMITS[tierName]
              ? {
                  patients: PLAN_LIMITS[tierName].patients,
                  users: PLAN_LIMITS[tierName].users,
                }
              : undefined
          }
          onSelect={
            isSubmitting
              ? undefined
              : () => {
                  setSelectedTier(tierName);
                  void handleSelectTier(tierName);
                }
          }
        />
      </div>
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle>Step 2: Choose Your Plan</CardTitle>
        <CardDescription>
          Select a plan that fits your facility needs. Paid plans redirect to
          Razorpay for secure checkout.
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          {pricingRegionLabel} for facilities in{" "}
          {pricingConfig.currency.code === "INR" ? "India" : "your region"}.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <BillingCycleToggle
          billingCycle={billingCycle}
          onChange={setBillingCycle}
        />

        <div className="space-y-6">
          {DISPLAY_TIER_GROUPS.map((group) => (
            <section key={group.title} className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {group.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {group.tiers.map((tierName) => renderTierCard(tierName))}
              </div>
            </section>
          ))}
        </div>

        <PlanComparisonCollapsible
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
        />

        <ContactSalesModal
          open={showContactSalesModal}
          onOpenChange={setShowContactSalesModal}
          source="onboarding_enterprise"
          defaultValues={{ message: enterpriseContactMessage }}
        />
      </CardContent>
    </Card>
  );
}
