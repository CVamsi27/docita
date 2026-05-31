"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { cn } from "@workspace/ui/lib/utils";
import { recommendTierForTeamSize } from "@workspace/utils";
import {
  OnboardingStepBody,
  OnboardingStepCard,
  OnboardingStepFooter,
  OnboardingStepHeader,
} from "@/features/onboarding/components/shared";
import { type TierPricing, usePricingConfig } from "@/features/subscription";
import { ContactSalesModal } from "@/features/dialogs";
import { TierCard, getFeatureDetails } from "@/features/subscription";
import {
  getAllFeaturesUpToTier,
  PLAN_LIMITS,
  getTierInfo,
  getTierValue,
} from "@/lib/subscription/tier-access";
import { tierSchema } from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription";
import {
  DISPLAY_TIERS,
  PLAN_AUDIENCE,
  buildTierCardConfig,
  BillingCycleToggle,
  PlanComparisonCollapsible,
} from "./plan-selection-step-helpers";
import type { PlanSelectionProps } from "./plan-selection-step.types";

export function PlanSelectionStepInner({
  onSelect,
  defaultTier = "ESSENTIAL",
  defaultBillingCycle = "MONTHLY",
  currency,
  teamUserCount = 1,
  onBack,
}: PlanSelectionProps) {
  const searchParams = useSearchParams();
  const { currency: detectedCurrency } = useLocaleCurrency();
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    const tierParam = searchParams.get("tier");
    if (tierParam && tierSchema.safeParse(tierParam).success) {
      return tierParam;
    }
    return defaultTier;
  });
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultBillingCycle,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const teamRecommendation = useMemo(
    () => recommendTierForTeamSize(teamUserCount),
    [teamUserCount],
  );

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

  const stepHeader = (
    <OnboardingStepHeader
      stepNumber={4}
      eyebrow="Choose plan"
      icon={<Sparkles strokeWidth={1.5} />}
      title="Choose your plan"
      description="Select a plan that fits your facility and team size. Paid plans redirect to Razorpay for secure checkout."
    />
  );

  if (isLoading) {
    return (
      <OnboardingStepCard>
        {stepHeader}
        <OnboardingStepBody
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
        </OnboardingStepBody>
      </OnboardingStepCard>
    );
  }

  if (error || !pricingConfig) {
    return (
      <OnboardingStepCard>
        {stepHeader}
        <OnboardingStepBody className="py-8 text-center">
          <p className="text-muted-foreground">
            We could not load pricing right now. Please try again shortly.
          </p>
        </OnboardingStepBody>
      </OnboardingStepCard>
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
    <OnboardingStepCard>
      {stepHeader}
      <OnboardingStepBody className="space-y-6">
        <p className="text-xs text-muted-foreground">
          {pricingRegionLabel} for facilities in{" "}
          {pricingConfig.currency.code === "INR" ? "India" : "your region"}.
        </p>
        {teamRecommendation ? (
          <Alert>
            <AlertTitle>Recommended for your team</AlertTitle>
            <AlertDescription>
              You are setting up{" "}
              <span className="font-medium text-foreground">
                {teamRecommendation.totalUsers}{" "}
                {teamRecommendation.totalUsers === 1 ? "user" : "users"}
              </span>{" "}
              (including you).{" "}
              <span className="font-medium text-foreground">
                {getTierInfo(getTierValue(teamRecommendation.tier)).name}
              </span>{" "}
              includes up to {teamRecommendation.includedUsers} users and is the
              smallest plan that covers your team.
            </AlertDescription>
          </Alert>
        ) : null}

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
                  isRecommended={teamRecommendation?.tier === tierName}
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
      </OnboardingStepBody>
      {onBack ? (
        <OnboardingStepFooter
          back={{ label: "Back to team", onClick: onBack }}
        />
      ) : null}
    </OnboardingStepCard>
  );
}
