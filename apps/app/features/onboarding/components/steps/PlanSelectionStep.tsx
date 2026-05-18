"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";
import { ContactSalesModal } from "@/features/dialogs";
import { TierCard, getFeatureDetails } from "@/features/subscription";
import {
  getAllFeaturesUpToTier,
  PLAN_LIMITS,
  getTierInfo,
  getTierValue,
} from "@/lib/tier-config";
import {
  type TierName,
  type WorkspaceProfile,
} from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription";
import {
  DISPLAY_TIERS,
  PLAN_AUDIENCE,
  buildTierCardConfig,
  WorkspaceSelector,
  BillingCycleToggle,
  PlanComparisonCollapsible,
} from "./plan-selection-step-helpers";

interface PlanSelectionProps {
  onSelect: (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: { currency?: string; workspaceProfile?: WorkspaceProfile },
  ) => Promise<void>;
  defaultTier?: string;
  defaultBillingCycle?: "MONTHLY" | "YEARLY";
  currency?: string;
  initialWorkspaceProfile?: WorkspaceProfile;
}

function PlanSelectionStepInner({
  onSelect,
  defaultTier = "ESSENTIAL",
  defaultBillingCycle = "MONTHLY",
  currency,
  initialWorkspaceProfile = "FULL_CLINICAL",
}: PlanSelectionProps) {
  const searchParams = useSearchParams();
  const { currency: detectedCurrency } = useLocaleCurrency();
  const [workspaceProfile, setWorkspaceProfile] = useState<WorkspaceProfile>(
    () => {
      if (searchParams.get("workspace") === "front_desk") return "FRONT_DESK";
      if (searchParams.get("tier") === "FRONT_DESK") return "FRONT_DESK";
      return initialWorkspaceProfile;
    },
  );
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    if (searchParams.get("tier") === "FRONT_DESK") return "FRONT_DESK";
    return defaultTier;
  });
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultBillingCycle,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  useEffect(() => {
    if (workspaceProfile === "FRONT_DESK") {
      setSelectedTier("FRONT_DESK");
      return;
    }
    setSelectedTier((prev) => (prev === "FRONT_DESK" ? "ESSENTIAL" : prev));
  }, [workspaceProfile]);

  const resolvedCurrency = currency ?? detectedCurrency;
  const { pricingConfig, isLoading, error } =
    usePricingConfig(resolvedCurrency);

  const featuresByTier = DISPLAY_TIERS.map((name) => {
    const tierName = name as TierName;
    const tier = getTierValue(tierName);
    return {
      tierName,
      tier,
      info: {
        ...getTierInfo(tier),
        tagline: PLAN_AUDIENCE[name] ?? getTierInfo(tier).tagline,
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
    const { cardPricing } = buildTierCardConfig(
      tier as TierName,
      resolvedCurrency,
      pricingConfig?.tiers ?? [],
    );
    const pricingPayload = tierPricingFromApi?.pricing ?? cardPricing;

    setIsSubmitting(true);
    try {
      await onSelect(tier, billingCycle, pricingPayload, {
        currency: resolvedCurrency,
        workspaceProfile:
          tier === "FRONT_DESK" ? "FRONT_DESK" : "FULL_CLINICAL",
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
          <span className="text-sm text-muted-foreground">Loading pricing…</span>
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
        <WorkspaceSelector
          workspaceProfile={workspaceProfile}
          onSelect={setWorkspaceProfile}
        />

        <BillingCycleToggle
          billingCycle={billingCycle}
          onChange={setBillingCycle}
        />

        <div className="flex flex-wrap justify-center gap-4">
          {featuresByTier.map(({ tierName, tier, info, features }) => {
            const { cardPricing, currencySymbol, overageHint, buttonLabel } =
              buildTierCardConfig(
                tierName,
                resolvedCurrency,
                pricingConfig.tiers,
              );

            return (
              <div
                key={tier}
                className={cn(
                  "relative flex w-full max-w-[22rem] flex-col sm:max-w-[24rem]",
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
                    PLAN_LIMITS[tierName as keyof typeof PLAN_LIMITS]
                      ? {
                          patients:
                            PLAN_LIMITS[tierName as keyof typeof PLAN_LIMITS]
                              .patients,
                          users:
                            PLAN_LIMITS[tierName as keyof typeof PLAN_LIMITS]
                              .users,
                        }
                      : undefined
                  }
                  onSelect={
                    isSubmitting
                      ? undefined
                      : () => {
                          setSelectedTier(tierName);
                          setWorkspaceProfile(
                            tierName === "FRONT_DESK"
                              ? "FRONT_DESK"
                              : "FULL_CLINICAL",
                          );
                          handleSelectTier(tierName);
                        }
                  }
                />
              </div>
            );
          })}
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

export function PlanSelectionStep(props: PlanSelectionProps) {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[240px] flex-col items-center justify-center gap-3 py-8"
          role="status"
          aria-live="polite"
          aria-label="Loading plan options"
        >
          <DocitaLoadingIndicator variant="section" withStatusRole={false} />
        </div>
      }
    >
      <PlanSelectionStepInner {...props} />
    </Suspense>
  );
}
