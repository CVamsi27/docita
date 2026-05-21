"use client";

import { Tier, getTierInfo, getTierPricing } from "@/lib/subscription/tier-access";
import { getTierName, parseSupportedCurrency } from "@workspace/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Button } from "@workspace/ui/components/form/button";
import { Lightbulb } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { TierCard } from "@/features/subscription/components/cards/tier-card";
import { ANNUAL_DISCOUNT_PERCENT, PRICING_CURRENCY_SYMBOLS, TIER_INFO, TIER_OVERAGE_RATES_BY_CURRENCY, type TierName, isFrontDeskClinicMode } from "@workspace/types";
import { getWhatsAppAddonPricingByCurrency } from "@workspace/utils";
import { PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription/config/plan-onboarding-highlights";
import { PLAN_ORDER } from "./billing-subscription-helpers";
import type { recommendTier } from "@/features/subscription/lib/recommend-tier";
import type { WorkspaceProfile } from "@workspace/types";

type Recommendation = ReturnType<typeof recommendTier>;
type PricingConfig = { tiers: { id: string; pricing: { monthly: number | "custom"; yearly: number | "custom" } }[] } | null | undefined;

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
  workspaceProfile: WorkspaceProfile | null | undefined;
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
  workspaceProfile,
  plansRef,
}: PlansSectionProps) {
  const isFrontDeskClinic = isFrontDeskClinicMode(
    getTierName(effectiveCurrentTier),
    workspaceProfile,
  );

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 className="ui-section-title text-[var(--fs-2xl)] leading-[var(--lh-tight)]">
            Choose a plan
          </h2>
          <p className="mt-1 text-[var(--fs-sm)] text-muted-foreground">
            Click any plan to start checkout. Yearly billing saves{" "}
            {ANNUAL_DISCOUNT_PERCENT}%.
          </p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border bg-muted/40 p-1 sm:self-auto">
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

      {recommendation ? (
        <Alert className="border-primary/40 bg-primary/5">
          <Lightbulb className="h-4 w-4 text-primary" />
          <AlertTitle className="text-[var(--fs-sm)]">
            {TIER_INFO[recommendation.tier].name} fits your usage best
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2 text-[var(--fs-xs)] leading-relaxed sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span>{recommendation.reasons.join(" · ")}</span>
            <Button
              size="sm"
              onClick={() =>
                handleSelectTier(recommendation.tier, selectedCycle)
              }
              disabled={!billingAllowed}
              className="shrink-0"
            >
              Review {TIER_INFO[recommendation.tier].name}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {planCards.map(({ tier, info }) => {
          const tierName = getTierName(tier);
          const tierPricingData = pricingConfig?.tiers.find(
            (t) => t.id === tierName,
          );
          const catalogPricing = getTierPricing(tierName);
          const resolvedPricing =
            tierPricingData?.pricing ?? {
              monthly: catalogPricing.monthly,
              yearly: catalogPricing.yearly,
            };
          const pricingCurrency = parseSupportedCurrency(currency);
          const currencySymbol =
            PRICING_CURRENCY_SYMBOLS[pricingCurrency] ??
            PRICING_CURRENCY_SYMBOLS.INR;
          const overageRates =
            TIER_OVERAGE_RATES_BY_CURRENCY[pricingCurrency]?.[tierName] ??
            TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
          const whatsappRate =
            tierName === "ESSENTIAL" ||
            tierName === "FRONT_DESK" ||
            tierName === "PROFESSIONAL" ||
            tierName === "HOSPITAL"
              ? getWhatsAppAddonPricingByCurrency(tierName, pricingCurrency)
                  .overageRate
              : 0;
          const overageParts = [
            overageRates?.appointmentRate > 0
              ? `${currencySymbol}${overageRates.appointmentRate}${
                  isFrontDeskClinic ? "/appointment" : "/consult"
                }`
              : null,
            overageRates?.userRate > 0
              ? `${currencySymbol}${overageRates.userRate}/user`
              : null,
            whatsappRate > 0
              ? `${currencySymbol}${whatsappRate}/WA msg`
              : null,
          ].filter((item): item is string => !!item);
          return (
            <TierCard
              key={tier}
              tier={tier}
              info={info}
              features={[]}
              isCurrentTier={tier === effectiveCurrentTier}
              isRecommended={
                !!recommendation && recommendation.tier === tierName
              }
              isLocked={false}
              currentTierValue={effectiveCurrentTier}
              keyHighlights={
                PLAN_ONBOARDING_KEY_HIGHLIGHTS[tierName] ?? []
              }
              pricing={resolvedPricing}
              billingCycle={selectedCycle}
              currencySymbol={currencySymbol}
              overageItems={
                overageParts.length > 0 ? overageParts : undefined
              }
              density="summary"
              buttonLabel={
                tier === Tier.ENTERPRISE ? "Contact Sales" : undefined
              }
              onSelect={
                billingAllowed && tier === Tier.ENTERPRISE
                  ? () => setShowContactSalesModal(true)
                  : billingAllowed
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
