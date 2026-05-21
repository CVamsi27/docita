"use client";

import { FC } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { cn } from "@workspace/ui/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { ComparisonTable } from "@/features/subscription";
import {
  PRICING_CURRENCY_SYMBOLS,
  SUBSCRIPTION_TRIAL_DAYS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  type TierName,
  type WorkspaceProfile,
  WORKSPACE_PROFILE_LABEL,
  WORKSPACE_PROFILE_MARKETING,
} from "@workspace/types";
import { parseSupportedCurrency } from "@workspace/utils";
import { getTierPricing } from "@/lib/subscription/tier-access";
import { type TierPricing } from "@/hooks/api/use-pricing";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DISPLAY_TIERS: TierName[] = [
  "STARTER",
  "FRONT_DESK",
  "ESSENTIAL",
  "PROFESSIONAL",
  "ENTERPRISE",
];

export const PLAN_AUDIENCE: Record<string, string> = {
  STARTER: "Best for solo doctors starting with full clinic workflows",
  ESSENTIAL:
    "Best for small facilities needing clear limits and simple billing",
  FRONT_DESK:
    "Best for reception-led facilities that need scheduling and billing without full clinical workflows in-app",
  PROFESSIONAL: "Best for multi-doctor facilities and growing practices",
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
  const overageRates = (
    TIER_OVERAGE_RATES_BY_CURRENCY[currencyKey] ??
    TIER_OVERAGE_RATES_BY_CURRENCY.INR
  )[tierName];
  const overageFromRates =
    overageRates?.appointmentRate > 0
      ? `then ${currencySymbol}${overageRates.appointmentRate}/extra consultation`
      : undefined;

  let overageHint: string | undefined;
  if (tierName === "ESSENTIAL") {
    overageHint = `${currencySymbol}0 for the first ${SUBSCRIPTION_TRIAL_DAYS} days, then regular billing`;
  } else if (tierName === "STARTER") {
    overageHint = [
      "Payment at signup (Razorpay). No unpaid trial on Starter.",
      overageFromRates,
    ]
      .filter(Boolean)
      .join(" ");
  } else if (tierName === "FRONT_DESK") {
    overageHint = [
      "Payment required at signup. Clinical workflows stay disabled in-app.",
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
// WorkspaceSelector
// ---------------------------------------------------------------------------

interface WorkspaceSelectorProps {
  workspaceProfile: WorkspaceProfile;
  onSelect: (profile: WorkspaceProfile) => void;
}

export const WorkspaceSelector: FC<WorkspaceSelectorProps> = ({
  workspaceProfile,
  onSelect,
}) => (
  <div className="rounded-lg border border-border/60 bg-card p-4 space-y-3">
    <MicroLabel>Workspace</MicroLabel>
    <p className="text-sm text-muted-foreground">
      Choose how Docita is used at this facility. This is separate from the
      commercial tier below (quotas and pricing).
    </p>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button
        type="button"
        variant={workspaceProfile === "FULL_CLINICAL" ? "default" : "outline"}
        className="flex-1 justify-center"
        onClick={() => onSelect("FULL_CLINICAL")}
      >
        {WORKSPACE_PROFILE_LABEL.FULL_CLINICAL}
      </Button>
      <Button
        type="button"
        variant={workspaceProfile === "FRONT_DESK" ? "default" : "outline"}
        className="flex-1 justify-center"
        onClick={() => onSelect("FRONT_DESK")}
      >
        {WORKSPACE_PROFILE_LABEL.FRONT_DESK}
      </Button>
    </div>
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
      {WORKSPACE_PROFILE_MARKETING[workspaceProfile].included.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
    {WORKSPACE_PROFILE_MARKETING[workspaceProfile].notIncluded.length > 0 ? (
      <div>
        <p className="text-sm font-medium text-foreground">
          Not included in this workspace
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {WORKSPACE_PROFILE_MARKETING[workspaceProfile].notIncluded.map(
            (line) => (
              <li key={line}>{line}</li>
            ),
          )}
        </ul>
      </div>
    ) : null}
  </div>
);

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
