"use client";

import { useState } from "react";
import {
  Tier,
  getTierInfo,
  getTierPricing,
} from "@/lib/subscription/tier-access";
import { getTierName, parseSupportedCurrency } from "@workspace/utils";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { TierCard } from "@/features/subscription/components/cards/tier-card";
import {
  ANNUAL_DISCOUNT_PERCENT,
  applyModeToPricing,
  getAvailableModesForTier,
  MODE_TIER_HIGHLIGHTS,
  PLAN_MODE_INFO,
  PLAN_MODES,
  type PlanMode,
  PRICING_CURRENCY_SYMBOLS,
  TIER_INFO,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  type TierName,
} from "@workspace/types";
import {
  formatRateWithCurrency,
  getWhatsAppAddonPricingByCurrency,
} from "@workspace/utils";
import { PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription/config/plan-onboarding-highlights";
import { PLAN_ORDER } from "./billing-subscription-helpers";
import type { recommendTier } from "@/features/subscription/lib/recommend-tier";
type Recommendation = ReturnType<typeof recommendTier>;
type PricingConfig =
  | {
      tiers: {
        id: string;
        pricing: { monthly: number | "custom"; yearly: number | "custom" };
      }[];
    }
  | null
  | undefined;

interface PlansSectionProps {
  effectiveCurrentTier: Tier;
  selectedCycle: "MONTHLY" | "YEARLY";
  setSelectedCycle: (cycle: "MONTHLY" | "YEARLY") => void;
  recommendation: Recommendation;
  billingAllowed: boolean;
  handleSelectTier: (tier: TierName, cycle: "MONTHLY" | "YEARLY") => void;
  setShowContactSalesModal: (open: boolean) => void;
  pricingConfig: PricingConfig;
  currency: string;
  plansRef: React.RefObject<HTMLDivElement | null>;
}

export function PlansSection({
  effectiveCurrentTier,
  selectedCycle,
  setSelectedCycle,
  recommendation,
  billingAllowed,
  handleSelectTier,
  setShowContactSalesModal,
  pricingConfig,
  currency,
  plansRef,
}: PlansSectionProps) {
  const pricingCurrency = parseSupportedCurrency(currency);

  // Top-level Plan Mode toggle (Full / Front Desk / Core).
  const [selectedMode, setSelectedMode] = useState<PlanMode>("FULL");

  const planCards = PLAN_ORDER.map((tier) => ({
    tier,
    info: getTierInfo(tier),
  }));

  return (
    <div
      ref={plansRef}
      id="billing-plans-section"
      className="scroll-mt-6 space-y-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 className="ui-section-title text-[var(--fs-2xl)] leading-[var(--lh-tight)]">
            Choose a plan
          </h2>
          <p className="mt-1 text-[var(--fs-xs)] text-muted-foreground">
            {PLAN_MODE_INFO[selectedMode].helpText}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          {/* Mode toggle */}
          <div
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border bg-muted/40 p-1"
            role="tablist"
            aria-label="Plan mode"
          >
            {PLAN_MODES.map((mode) => {
              const info = PLAN_MODE_INFO[mode];
              const active = selectedMode === mode;
              return (
                <SymbolTooltip key={mode} label={info.helpText}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setSelectedMode(mode)}
                    aria-pressed={active}
                  >
                    {info.shortLabel}
                  </Button>
                </SymbolTooltip>
              );
            })}
          </div>
          {/* Cycle toggle */}
          <div className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border bg-muted/40 p-1">
            <Button
              variant={selectedCycle === "MONTHLY" ? "default" : "ghost"}
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedCycle("MONTHLY")}
            >
              Monthly
            </Button>
            <Button
              variant={selectedCycle === "YEARLY" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setSelectedCycle("YEARLY")}
            >
              Yearly
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold leading-none",
                  selectedCycle === "YEARLY"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-success/15 text-success",
                )}
              >
                {`Save ${ANNUAL_DISCOUNT_PERCENT}%`}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {recommendation ? (
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm sm:p-5",
          )}
          role="status"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
              aria-hidden
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-primary">
                  Recommended
                </span>
                <span className="text-[var(--fs-sm)] font-semibold text-foreground">
                  {TIER_INFO[recommendation.tier].name} fits your usage best
                </span>
              </div>
              {recommendation.reasons.length > 0 ? (
                <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[var(--fs-xs)] text-muted-foreground">
                  {recommendation.reasons.map((reason) => (
                    <li
                      key={reason}
                      className="flex items-center gap-1.5 before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/70 first:before:hidden"
                    >
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                handleSelectTier(recommendation.tier, selectedCycle)
              }
              disabled={!billingAllowed}
              className="shrink-0 gap-1.5 self-start sm:self-center"
            >
              Review {TIER_INFO[recommendation.tier].name}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {planCards.map(({ tier, info }) => {
          const tierName = getTierName(tier);
          const tierPricingData = pricingConfig?.tiers.find(
            (t) => t.id === tierName,
          );
          const catalogPricing = getTierPricing(tierName);
          const basePricing = tierPricingData?.pricing ?? {
            monthly: catalogPricing.monthly,
            yearly: catalogPricing.yearly,
          };

          const supportedModes = getAvailableModesForTier(tierName);
          const effectiveMode: PlanMode = supportedModes.includes(selectedMode)
            ? selectedMode
            : "FULL";
          const resolvedPricing = applyModeToPricing(
            basePricing,
            effectiveMode,
          );

          const currencySymbol =
            PRICING_CURRENCY_SYMBOLS[pricingCurrency] ??
            PRICING_CURRENCY_SYMBOLS.INR;
          const overageRates =
            TIER_OVERAGE_RATES_BY_CURRENCY[pricingCurrency]?.[tierName] ??
            TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
          const whatsappRate =
            effectiveMode !== "CORE" &&
            (tierName === "ESSENTIAL" ||
              tierName === "PROFESSIONAL" ||
              tierName === "HOSPITAL")
              ? getWhatsAppAddonPricingByCurrency(tierName, pricingCurrency)
                  .overageRate
              : 0;
          // Locale-aware money formatting (₹0.75, $0.04, AED 0.18, R 0.45 …)
          // and "per <unit>" copy instead of "/unit".
          const fmt = (n: number) => formatRateWithCurrency(n, pricingCurrency);
          const overageParts = [
            overageRates?.appointmentRate > 0
              ? `${fmt(overageRates.appointmentRate)} per ${
                  effectiveMode === "FRONT_DESK" ? "appointment" : "consult"
                }`
              : null,
            overageRates?.userRate > 0
              ? `${fmt(overageRates.userRate)} per user`
              : null,
            whatsappRate > 0 ? `${fmt(whatsappRate)} per WA msg` : null,
          ].filter((item): item is string => !!item);

          // Mode-specific highlights override the default tier highlights so
          // each tier reads differently in Full / Front Desk / Core mode.
          const modeHighlights =
            MODE_TIER_HIGHLIGHTS[effectiveMode]?.[tierName] ?? null;
          const keyHighlights =
            modeHighlights ?? PLAN_ONBOARDING_KEY_HIGHLIGHTS[tierName] ?? [];

          // Replace the tier name with a (Mode) suffix so the card label reads
          // e.g. "Professional · Front Desk".
          const modeSuffix =
            effectiveMode === "FULL"
              ? null
              : ` · ${PLAN_MODE_INFO[effectiveMode].name}`;
          const cardInfo = modeSuffix
            ? { ...info, name: `${info.name}${modeSuffix}` }
            : info;
          const modeMismatched =
            effectiveMode !== selectedMode && selectedMode !== "FULL";

          return (
            <TierCard
              key={tier}
              tier={tier}
              info={cardInfo}
              features={[]}
              isCurrentTier={tier === effectiveCurrentTier}
              isRecommended={
                !!recommendation && recommendation.tier === tierName
              }
              isLocked={modeMismatched}
              currentTierValue={effectiveCurrentTier}
              keyHighlights={keyHighlights}
              pricing={resolvedPricing}
              billingCycle={selectedCycle}
              currencySymbol={currencySymbol}
              overageItems={overageParts.length > 0 ? overageParts : undefined}
              density="summary"
              buttonLabel={
                tier === Tier.ENTERPRISE
                  ? "Contact Sales"
                  : modeMismatched
                    ? `Only available on Full`
                    : undefined
              }
              onSelect={
                billingAllowed && tier === Tier.ENTERPRISE
                  ? () => setShowContactSalesModal(true)
                  : billingAllowed && !modeMismatched
                    ? () => handleSelectTier(tierName, selectedCycle)
                    : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
