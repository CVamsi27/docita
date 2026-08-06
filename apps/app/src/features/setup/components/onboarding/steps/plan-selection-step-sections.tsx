"use client";

import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle, Badge, Button, SymbolTooltip } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { OnboardingStepBody, OnboardingStepCard } from "@/features/setup/components/onboarding/shared";
import { getTierInfo, getTierValue, PLAN_LIMITS } from "@/lib/subscription/tier-access";
import { type TierPricing, TierCard, PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription";
import type { PlanFeature } from "@/features/subscription";
import { applyModeToPricing, getAvailableModesForTier, MODE_TIER_HIGHLIGHTS, PLAN_MODE_INFO, PLAN_MODES, type PlanMode, type TierInfo, type TierName } from "@workspace/types";
import { BillingCycleToggle } from "./plan-selection-step-helpers";
import { buildTierCardConfig } from "./plan-selection-data";

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

interface LoadingStateProps {
  stepHeader: ReactNode;
}

export const PlanSelectionLoading: FC<LoadingStateProps> = ({
  stepHeader,
}) => {
  const { t } = useTranslation("Onboarding.planSelection");
  return (
  <OnboardingStepCard>
    {stepHeader}
    <OnboardingStepBody
      className="flex flex-col items-center justify-center gap-3 py-12 sm:flex-row"
      role="status"
      aria-live="polite"
      aria-label={t("loadingAriaLabel")}
    >
      <DocitaLoadingIndicator
        variant="section"
        withStatusRole={false}
        iconClassName="h-8 w-8 text-muted-foreground"
      />
      <span className="text-sm text-muted-foreground">
        {t("loading")}
      </span>
    </OnboardingStepBody>
  </OnboardingStepCard>
  );
};

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  stepHeader: ReactNode;
}

export const PlanSelectionError: FC<ErrorStateProps> = ({ stepHeader }) => {
  const { t } = useTranslation("Onboarding.planSelection");
  return (
  <OnboardingStepCard>
    {stepHeader}
    <OnboardingStepBody className="py-8 text-center">
      <p className="text-muted-foreground">
        {t("loadError")}
      </p>
    </OnboardingStepBody>
  </OnboardingStepCard>
  );
};

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
  const { t } = useTranslation("Onboarding.planSelection");
  if (!teamRecommendation) return null;
  return (
    <Alert>
      <AlertTitle>{t("teamRecommendationTitle")}</AlertTitle>
      <AlertDescription>
        {t("teamRecommendationIntro", {
          count: teamRecommendation.totalUsers,
          users: t(
            teamRecommendation.totalUsers === 1 ? "user" : "users",
          ),
        })}{" "}
        <span className="font-medium text-foreground">
          {getTierInfo(getTierValue(teamRecommendation.tier)).name}
        </span>{" "}
        {t("teamRecommendationCovers", {
          count: teamRecommendation.includedUsers,
          users: t(
            teamRecommendation.includedUsers === 1 ? "user" : "users",
          ),
        })}
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
}) => {
  const { t } = useTranslation("Onboarding.planSelection");
  return (
  <>
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-muted/40 p-1"
        role="tablist"
        aria-label={t("planModeAriaLabel")}
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
};

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
}) => {
  const { t } = useTranslation("Onboarding.planSelection");
  return (
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
              {t("popularBadge")}
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
              modeMismatched ? t("onlyOnFull") : buttonLabel
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
};
