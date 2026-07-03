"use client";

import type { FC, ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  OnboardingStepBody,
  OnboardingStepCard,
} from "@/features/onboarding/components/shared";
import {
  getTierInfo,
  getTierValue,
  PLAN_LIMITS,
} from "@/lib/subscription/tier-access";
import {
  type TierPricing,
  TierCard,
  PLAN_ONBOARDING_KEY_HIGHLIGHTS,
} from "@/features/subscription";
import type { PlanFeature } from "@/features/subscription";
import {
  applyModeToPricing,
  getAvailableModesForTier,
  MODE_TIER_HIGHLIGHTS,
  PLAN_MODE_INFO,
  PLAN_MODES,
  type PlanMode,
  type TierInfo,
  type TierName,
} from "@workspace/types";
import {
  buildTierCardConfig,
  BillingCycleToggle,
} from "./plan-selection-step-helpers";

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

interface LoadingStateProps {
  stepHeader: ReactNode;
}

export const PlanSelectionLoading: FC<LoadingStateProps> = ({
  stepHeader,
}) => (
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

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  stepHeader: ReactNode;
}

export const PlanSelectionError: FC<ErrorStateProps> = ({ stepHeader }) => (
  <OnboardingStepCard>
    {stepHeader}
    <OnboardingStepBody className="py-8 text-center">
      <p className="text-muted-foreground">
        We could not load pricing right now. Please try again shortly.
      </p>
    </OnboardingStepBody>
  </OnboardingStepCard>
);

// ---------------------------------------------------------------------------
// Team recommendation alert
// ---------------------------------------------------------------------------

interface TeamRecommendation {
  tier: TierName;
  totalUsers: number;
  includedUsers: number;
}

interface TeamRecommendationAlertProps {
  teamRecommendation: TeamRecommendation | null;
}

export const TeamRecommendationAlert: FC<TeamRecommendationAlertProps> = ({
  teamRecommendation,
}) => {
  if (!teamRecommendation) return null;
  return (
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
        includes up to {teamRecommendation.includedUsers}{" "}
        {teamRecommendation.includedUsers === 1 ? "user" : "users"} and is the
        smallest plan that covers your team.
      </AlertDescription>
    </Alert>
  );
};

// ---------------------------------------------------------------------------
// Plan mode toggle + billing cycle bar
// ---------------------------------------------------------------------------

interface PlanModeBarProps {
  selectedMode: PlanMode;
  billingCycle: "MONTHLY" | "YEARLY";
  onModeChange: (mode: PlanMode) => void;
  onBillingCycleChange: (cycle: "MONTHLY" | "YEARLY") => void;
}

export const PlanModeBar: FC<PlanModeBarProps> = ({
  selectedMode,
  billingCycle,
  onModeChange,
  onBillingCycleChange,
}) => (
  <>
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/40 p-1"
        role="tablist"
        aria-label="Plan mode"
      >
        {PLAN_MODES.map((mode) => {
          const modeInfo = PLAN_MODE_INFO[mode];
          const active = selectedMode === mode;
          return (
            <SymbolTooltip key={mode} label={modeInfo.helpText}>
              <Button
                variant={active ? "default" : "ghost"}
                size="sm"
                className="rounded-full"
                onClick={() => onModeChange(mode)}
                aria-pressed={active}
              >
                {modeInfo.shortLabel}
              </Button>
            </SymbolTooltip>
          );
        })}
      </div>
      <BillingCycleToggle
        billingCycle={billingCycle}
        onChange={onBillingCycleChange}
      />
    </div>
    <p className="-mt-2 text-center text-xs text-muted-foreground sm:text-left">
      {PLAN_MODE_INFO[selectedMode].helpText}
    </p>
  </>
);

// ---------------------------------------------------------------------------
// Tier card grid
// ---------------------------------------------------------------------------

interface FeaturesByTierEntry {
  tierName: TierName;
  tier: number;
  info: TierInfo;
  features: PlanFeature[];
}

interface TierCardGridProps {
  featuresByTier: FeaturesByTierEntry[];
  pricingConfigTiers: TierPricing[];
  resolvedCurrency: string;
  selectedTier: TierName | string;
  selectedMode: PlanMode;
  billingCycle: "MONTHLY" | "YEARLY";
  teamRecommendation: TeamRecommendation | null;
  isSubmitting: boolean;
  onSelectCard: (tier: TierName, mode: PlanMode) => void;
}

export const TierCardGrid: FC<TierCardGridProps> = ({
  featuresByTier,
  pricingConfigTiers,
  resolvedCurrency,
  selectedTier,
  selectedMode,
  billingCycle,
  teamRecommendation,
  isSubmitting,
  onSelectCard,
}) => (
  <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {featuresByTier.map(({ tierName, tier, info, features }: FeaturesByTierEntry) => {
      const { cardPricing, currencySymbol, overageHint, buttonLabel } =
        buildTierCardConfig(tierName, resolvedCurrency, pricingConfigTiers);

      const supportedModes = getAvailableModesForTier(tierName);
      const effectiveMode: PlanMode = supportedModes.includes(selectedMode)
        ? selectedMode
        : "FULL";
      const modeMismatched =
        effectiveMode !== selectedMode && selectedMode !== "FULL";
      const resolvedPricing = applyModeToPricing(cardPricing, effectiveMode);
      const modeSuffix =
        effectiveMode === "FULL"
          ? null
          : ` · ${PLAN_MODE_INFO[effectiveMode].name}`;
      const cardInfo = modeSuffix
        ? { ...info, name: `${info.name}${modeSuffix}` }
        : info;
      const keyHighlights =
        MODE_TIER_HIGHLIGHTS[effectiveMode]?.[tierName] ??
        PLAN_ONBOARDING_KEY_HIGHLIGHTS[tierName] ??
        [];

      return (
        <div key={tier} className="relative flex flex-col">
          {tierName === "ESSENTIAL" ? (
            <Badge className="absolute -top-2 left-4 z-10 bg-success text-success-foreground">
              Popular
            </Badge>
          ) : null}
          <TierCard
            tier={tier}
            info={cardInfo}
            features={features}
            isCurrentTier={false}
            isLocked={modeMismatched}
            isRecommended={teamRecommendation?.tier === tierName}
            className={cn(
              "h-full",
              selectedTier === tierName &&
                !modeMismatched &&
                "border-primary ring-2 ring-primary/20 shadow-lg",
            )}
            keyHighlights={keyHighlights}
            pricing={resolvedPricing}
            billingCycle={billingCycle}
            currencySymbol={currencySymbol}
            overageHint={overageHint}
            buttonLabel={
              modeMismatched ? "Only available on Full" : buttonLabel
            }
            maxDisplay={5}
            usageHints={
              PLAN_LIMITS[tierName]
                ? {
                    patients: PLAN_LIMITS[tierName].patients,
                    users: PLAN_LIMITS[tierName].users,
                  }
                : undefined
            }
            onSelect={
              isSubmitting || modeMismatched
                ? undefined
                : () => onSelectCard(tierName, effectiveMode)
            }
          />
        </div>
      );
    })}
  </div>
);
