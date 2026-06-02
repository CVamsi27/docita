"use client";

import type { FC } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { ComparisonTable } from "@/features/subscription";
import {
  PRICING_CURRENCY_SYMBOLS,
  PUBLISHED_PLAN_LADDER,
  SUBSCRIPTION_TRIAL_DAYS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  type TierName,
} from "@workspace/types";
import {
  formatPriceWithCurrency,
  formatRateWithCurrency,
  parseSupportedCurrency,
} from "@workspace/utils";
import { getTierPricing } from "@/lib/subscription/tier-access";
import { type TierPricing } from "@/features/subscription";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Onboarding plan selection uses the same published clinical ladder as the rest
// of the app — sourced from the single PUBLISHED_PLAN_LADDER catalog (not a
// hardcoded copy) so the order/membership can never drift. The Full / Front
// Desk / Core toggle is exposed on the step; mode comes from the `mode` query.
export const DISPLAY_TIERS: readonly TierName[] = PUBLISHED_PLAN_LADDER;

export const PLAN_AUDIENCE: Record<string, string> = {
  STARTER: "Best for solo doctors starting with full clinic workflows",
  ESSENTIAL:
    "Best for small facilities needing clear limits and simple billing",
  PROFESSIONAL: "Best for multi-doctor facilities and growing practices",
  HOSPITAL: "Best for multi-branch hospitals and specialty groups",
  ENTERPRISE: "Best for hospitals and chains with custom requirements",
};

// ---------------------------------------------------------------------------
// Tier card config builder
// ---------------------------------------------------------------------------

export interface TierCardConfig {
  cardPricing: { monthly: number | "custom"; yearly: number | "custom" };
  currencySymbol: string;
  overageHint: string | undefined;
  buttonLabel: string;
}

export function buildTierCardConfig(
  tierName: TierName,
  resolvedCurrency: string,
  apiTiers: TierPricing[],
): TierCardConfig {
  const tierPricingFromApi = apiTiers.find((t) => t.id === tierName);
  const catalogPricing = getTierPricing(tierName);
  const cardPricing = tierPricingFromApi?.pricing ?? {
    monthly: catalogPricing.monthly,
    yearly: catalogPricing.yearly,
  };

  const currencyKey = parseSupportedCurrency(resolvedCurrency);
  const currencySymbol =
    PRICING_CURRENCY_SYMBOLS[currencyKey] ?? resolvedCurrency;
  const overageRates = (TIER_OVERAGE_RATES_BY_CURRENCY[currencyKey] ??
    TIER_OVERAGE_RATES_BY_CURRENCY.INR)[tierName];
  const overageFromRates =
    overageRates?.appointmentRate > 0
      ? `then ${formatRateWithCurrency(overageRates.appointmentRate, currencyKey)} per extra consultation`
      : undefined;

  let overageHint: string | undefined;
  if (tierName === "ESSENTIAL") {
    overageHint = `${formatPriceWithCurrency(0, currencyKey)} for the first ${SUBSCRIPTION_TRIAL_DAYS} days, then regular billing`;
  } else if (tierName === "STARTER") {
    overageHint = [
      "Payment at signup (Razorpay). No unpaid trial on Starter.",
      overageFromRates,
    ]
      .filter(Boolean)
      .join(" ");
  } else if (tierName === "HOSPITAL") {
    overageHint = [
      "Multi-branch billing. Annual contracts available.",
      overageFromRates,
    ]
      .filter(Boolean)
      .join(" ");
  } else if (tierName === "PROFESSIONAL") {
    overageHint = [
      "Payment required at signup. Unpaid trial is only on Essential.",
      overageFromRates,
    ]
      .filter(Boolean)
      .join(" ");
  } else if (tierName === "ENTERPRISE") {
    overageHint = "Custom pricing and deployment. Contact sales to continue.";
  } else {
    overageHint = overageFromRates;
  }

  const buttonLabel =
    tierName === "ESSENTIAL"
      ? `Start free ${SUBSCRIPTION_TRIAL_DAYS}-day trial`
      : tierName === "ENTERPRISE"
        ? "Contact sales"
        : "Select and pay";

  return { cardPricing, currencySymbol, overageHint, buttonLabel };
}

// ---------------------------------------------------------------------------
// BillingCycleToggle
// ---------------------------------------------------------------------------

interface BillingCycleToggleProps {
  billingCycle: "MONTHLY" | "YEARLY";
  onChange: (cycle: "MONTHLY" | "YEARLY") => void;
}

export const BillingCycleToggle: FC<BillingCycleToggleProps> = ({
  billingCycle,
  onChange,
}) => (
  <div className="flex justify-center">
    <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={billingCycle === "MONTHLY" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("MONTHLY")}
      >
        Monthly
      </Button>
      <Button
        variant={billingCycle === "YEARLY" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("YEARLY")}
      >
        Yearly{" "}
        <Badge variant="secondary" className="ml-1">
          2 months free
        </Badge>
      </Button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// PlanComparisonCollapsible
// ---------------------------------------------------------------------------

interface PlanComparisonCollapsibleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PlanComparisonCollapsible: FC<PlanComparisonCollapsibleProps> = ({
  open,
  onOpenChange,
}) => (
  <Collapsible open={open} onOpenChange={onOpenChange}>
    <CollapsibleTrigger asChild>
      <Button
        variant="ghost"
        className="w-full justify-between border border-border/50 rounded-lg px-4 py-3 h-auto"
      >
        <span className="text-sm font-medium">Compare all plans</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="mt-2">
      <ComparisonTable currentTier={0} />
    </CollapsibleContent>
  </Collapsible>
);
