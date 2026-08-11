import { ANNUAL_DISCOUNT_PERCENT, SUBSCRIPTION_TRIAL_DAYS, applyModeToPricing, getAvailableModesForTier, PLAN_MODE_INFO, PLAN_MODES, type PlanMode, PRICING_CURRENCY_SYMBOLS, TIER_INFO, type TierName } from "@workspace/types";
import { parseSupportedCurrency } from "@workspace/utils";
import { Button, SymbolTooltip } from "@workspace/ui/components";
import { TierCard } from "./cards/tier-card";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@workspace/ui/lib/utils";
import { planHighlightKeys } from "../config/plan-highlight-keys";
import type { TierRecommendation } from "../lib/recommend-tier";

type Recommendation = TierRecommendation | null;
type PricingConfig = { tiers: { id: string; pricing: { monthly: number | "custom"; yearly: number | "custom" } }[] } | null | undefined;

export function BillingPlansHeader({ selectedMode, onModeChange, selectedCycle, onCycleChange }: {
  selectedMode: PlanMode; onModeChange: (mode: PlanMode) => void;
  selectedCycle: "MONTHLY" | "YEARLY"; onCycleChange: (cycle: "MONTHLY" | "YEARLY") => void;
}) {
  const { t } = useTranslation("Subscription.billingPlans");
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h2 className="ui-section-title text-[var(--fs-2xl)] leading-[var(--lh-tight)]">{t("choosePlan")}</h2>
        <p className="mt-1 text-[var(--fs-xs)] text-muted-foreground">{PLAN_MODE_INFO[selectedMode].helpText}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border bg-muted/40 p-1" role="tablist" aria-label={t("planModeAriaLabel")}>
          {PLAN_MODES.map((mode) => {
            const info = PLAN_MODE_INFO[mode];
            const active = selectedMode === mode;
            return (
              <SymbolTooltip key={mode} label={info.helpText}>
                <Button variant={active ? "default" : "ghost"} size="sm" className="rounded-full" onClick={() => onModeChange(mode)} aria-pressed={active}>
                  {info.shortLabel}
                </Button>
              </SymbolTooltip>
            );
          })}
        </div>
        <div className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border bg-muted/40 p-1">
          <Button variant={selectedCycle === "MONTHLY" ? "default" : "ghost"} size="sm" className="rounded-full" onClick={() => onCycleChange("MONTHLY")}>{t("monthly")}</Button>
          <Button variant={selectedCycle === "YEARLY" ? "default" : "ghost"} size="sm" className="gap-1.5 rounded-full" onClick={() => onCycleChange("YEARLY")}>
            {t("yearly")}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[var(--fs-2xs)] font-semibold leading-none", selectedCycle === "YEARLY" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-success/15 text-success")}>{t("saveBadge", { amount: `${ANNUAL_DISCOUNT_PERCENT}%` })}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BillingRecommendationBanner({ recommendation, selectedCycle, billingAllowed, onSelectTier }: {
  recommendation: Recommendation; selectedCycle: "MONTHLY" | "YEARLY"; billingAllowed: boolean; onSelectTier: (tier: TierName, cycle: "MONTHLY" | "YEARLY") => void;
}) {
  const { t } = useTranslation("Subscription.billingPlans");
  if (!recommendation) return null;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm sm:p-5" role="status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden><Sparkles className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-primary">{t("recommendedBadge")}</span>
            <span className="text-[var(--fs-sm)] font-semibold text-foreground">{t("fitsUsageBest", { tier: TIER_INFO[recommendation.tier]?.name ?? recommendation.tier })}</span>
          </div>
          {recommendation.reasons.length > 0 ? (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[var(--fs-xs)] text-muted-foreground">
              {recommendation.reasons.map((reason) => (
                <li key={reason} className="flex items-center gap-1.5 before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/70 first:before:hidden">{reason}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button size="sm" variant="primary" onClick={() => onSelectTier(recommendation.tier, selectedCycle)} disabled={!billingAllowed} className="shrink-0 gap-1.5 self-start sm:self-center">
          {t("reviewTier", { tier: TIER_INFO[recommendation.tier]?.name ?? recommendation.tier })}<ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function BillingPlanCards({ planCards, selectedMode, selectedCycle, currency, effectiveCurrentTier, recommendation, billingAllowed, onSelectTier, onContactSales }: {
  planCards: { tier: number; info: { name: string; tagline?: string; description?: string; color?: string } }[];
  selectedMode: PlanMode; selectedCycle: "MONTHLY" | "YEARLY"; pricingConfig: PricingConfig; currency: string;
  effectiveCurrentTier: number; recommendation: Recommendation; billingAllowed: boolean;
  onSelectTier: (tier: TierName, cycle: "MONTHLY" | "YEARLY") => void; onContactSales: () => void;
}) {
  const { t: tHighlights } = useTranslation("Subscription.planHighlights");
  const { t } = useTranslation("Subscription.billingPlans");
  const tierNames: TierName[] = ["STARTER", "ESSENTIAL", "PROFESSIONAL", "HOSPITAL", "ENTERPRISE"];
  const pricingCurrency = parseSupportedCurrency(currency);

  return (
    <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {planCards.map(({ tier, info }, i) => {
        const tierName = tierNames[i] ?? "STARTER";
        const basePricing = { monthly: 0, yearly: 0 };
        const supportedModes = getAvailableModesForTier(tierName);
        const effectiveMode: PlanMode = supportedModes.includes(selectedMode) ? selectedMode : "FULL";
        const resolvedPricing = applyModeToPricing(basePricing, effectiveMode);
        const currencySymbol = PRICING_CURRENCY_SYMBOLS[pricingCurrency] ?? "\u20B9";
        const keyHighlights = planHighlightKeys(tierName).map((key) =>
          key === "essential.trial"
            ? tHighlights(key, { days: SUBSCRIPTION_TRIAL_DAYS })
            : tHighlights(key),
        );
        const modeSuffix = effectiveMode === "FULL" ? null : ` \u00b7 ${PLAN_MODE_INFO[effectiveMode].name}`;
        const cardInfo = modeSuffix ? { ...info, name: `${info.name}${modeSuffix}` } : info;
        const modeMismatched = effectiveMode !== selectedMode && selectedMode !== "FULL";

        return (
          <TierCard key={tier} tier={tier} info={cardInfo} features={[]}
            isCurrentTier={tier === effectiveCurrentTier} isLocked={modeMismatched}
            isRecommended={!!recommendation && recommendation.tier === tierName}
            currentTierValue={effectiveCurrentTier} keyHighlights={keyHighlights}
            pricing={resolvedPricing} billingCycle={selectedCycle} currencySymbol={currencySymbol}
            density="summary" buttonLabel={tier >= 4 ? t("contactSales") : modeMismatched ? t("onlyOnFull") : undefined}
            onSelect={billingAllowed && tier >= 4 ? onContactSales : billingAllowed && !modeMismatched ? () => onSelectTier(tierName, selectedCycle) : undefined}
          />
        );
      })}
    </div>
  );
}
