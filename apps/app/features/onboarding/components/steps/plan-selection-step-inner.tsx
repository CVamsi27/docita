"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { recommendTierForTeamSize } from "@workspace/utils";
import {
  OnboardingStepBody,
  OnboardingStepCard,
  OnboardingStepFooter,
  OnboardingStepHeader,
} from "@/features/onboarding/components/shared";
import { type TierPricing, usePricingConfig, getFeatureDetails } from "@/features/subscription";
import { ContactSalesModal } from "@/features/dialogs";
import {
  getAllFeaturesUpToTier,
  getTierInfo,
  getTierValue,
} from "@/lib/subscription/tier-access";
import {
  Tier,
  applyModeToPricing,
  planModeSchema,
  tierSchema,
  type PlanMode,
} from "@workspace/types";
import { getTierName } from "@workspace/utils";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  DISPLAY_TIERS,
  PLAN_AUDIENCE,
  buildTierCardConfig,
  getEnterpriseContactMessage,
  getPricingRegionLabel,
  PlanComparisonCollapsible,
} from "./plan-selection-step-helpers";
import {
  PlanSelectionLoading,
  PlanSelectionError,
  TeamRecommendationAlert,
  PlanModeBar,
  TierCardGrid,
} from "./plan-selection-step-sections";
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
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(() => {
    const billingParam = searchParams.get("billing")?.toUpperCase();
    return billingParam === "YEARLY" || billingParam === "MONTHLY"
      ? billingParam
      : defaultBillingCycle;
  });
  const [selectedMode, setSelectedMode] = useState<PlanMode>(() => {
    const parsed = planModeSchema.safeParse(
      searchParams.get("mode")?.toUpperCase(),
    );
    return parsed.success ? parsed.data : "FULL";
  });
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

  const handleSelectTier = async (tier: string, mode: PlanMode) => {
    if (tier === getTierName(Tier.ENTERPRISE)) {
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
    const pricingPayload = applyModeToPricing(
      tierPricingFromApi?.pricing ?? cardPricing,
      mode,
    );

    setIsSubmitting(true);
    try {
      await onSelect(tier, billingCycle, pricingPayload, {
        currency: resolvedCurrency,
        mode,
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
    return <PlanSelectionLoading stepHeader={stepHeader} />;
  }

  if (error || !pricingConfig) {
    return <PlanSelectionError stepHeader={stepHeader} />;
  }

  const enterpriseContactMessage = getEnterpriseContactMessage(billingCycle);

  return (
    <OnboardingStepCard wide>
      {stepHeader}
      <OnboardingStepBody className="space-y-6">
        <p className="text-xs text-muted-foreground">
          {getPricingRegionLabel(resolvedCurrency)} for facilities in{" "}
          {pricingConfig.currency.code === "INR" ? "India" : "your region"}.
        </p>

        <TeamRecommendationAlert teamRecommendation={teamRecommendation} />

        <PlanModeBar
          selectedMode={selectedMode}
          billingCycle={billingCycle}
          onModeChange={setSelectedMode}
          onBillingCycleChange={setBillingCycle}
        />

        <TierCardGrid
          featuresByTier={featuresByTier}
          pricingConfigTiers={pricingConfig.tiers}
          resolvedCurrency={resolvedCurrency}
          selectedTier={selectedTier}
          selectedMode={selectedMode}
          billingCycle={billingCycle}
          teamRecommendation={teamRecommendation}
          isSubmitting={isSubmitting}
          onSelectCard={(tier, mode) => {
            setSelectedTier(tier);
            void handleSelectTier(tier, mode);
          }}
        />

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
