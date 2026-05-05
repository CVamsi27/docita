"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import { TierCard } from "@/features/subscription/components/cards/tier-card";
import { ComparisonTable } from "@/features/subscription/components/pricing/comparison-table";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  getAllFeaturesUpToTier,
  PLAN_LIMITS,
  getTierInfo,
  getTierPricing,
  getTierValue,
} from "@/lib/tier-config";
import {
  PRICING_CURRENCY_SYMBOLS,
  SUBSCRIPTION_TRIAL_DAYS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  type TierName,
  type WorkspaceProfile,
  WORKSPACE_PROFILE_LABEL,
  WORKSPACE_PROFILE_MARKETING,
} from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription/config/plan-onboarding-highlights";

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

const DISPLAY_TIERS = [
  "STARTER",
  "FRONT_DESK",
  "ESSENTIAL",
  "PROFESSIONAL",
  "ENTERPRISE",
];

const PLAN_AUDIENCE: Record<string, string> = {
  STARTER: "Best for solo doctors starting with full clinic workflows",
  ESSENTIAL:
    "Best for small facilities needing clear limits and simple billing",
  FRONT_DESK:
    "Best for reception-led facilities that need scheduling and billing without full clinical workflows in-app",
  PROFESSIONAL: "Best for multi-doctor facilities and growing practices",
  ENTERPRISE: "Best for hospitals and chains with custom requirements",
};

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
      if (searchParams.get("workspace") === "front_desk") {
        return "FRONT_DESK";
      }
      if (searchParams.get("tier") === "FRONT_DESK") {
        return "FRONT_DESK";
      }
      return initialWorkspaceProfile;
    },
  );
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    if (searchParams.get("tier") === "FRONT_DESK") {
      return "FRONT_DESK";
    }
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
    const catalog = getTierPricing(tier as TierName);
    const pricingPayload = tierPricingFromApi?.pricing ?? {
      monthly: catalog.monthly,
      yearly: catalog.yearly,
    };

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
              onClick={() => setWorkspaceProfile("FULL_CLINICAL")}
            >
              {WORKSPACE_PROFILE_LABEL.FULL_CLINICAL}
            </Button>
            <Button
              type="button"
              variant={workspaceProfile === "FRONT_DESK" ? "default" : "outline"}
              className="flex-1 justify-center"
              onClick={() => setWorkspaceProfile("FRONT_DESK")}
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

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={billingCycle === "MONTHLY" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("MONTHLY")}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === "YEARLY" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("YEARLY")}
            >
              Yearly{" "}
              <Badge variant="secondary" className="ml-1">
                2 months free
              </Badge>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {featuresByTier.map(({ tierName, tier, info, features }) => {
              const tierPricingFromApi = pricingConfig.tiers.find(
                (t: TierPricing) => t.id === tierName,
              );
              const catalogPricing = getTierPricing(tierName);
              const cardPricing =
                tierPricingFromApi?.pricing ?? {
                  monthly: catalogPricing.monthly,
                  yearly: catalogPricing.yearly,
                };
              const currencyKey =
                resolvedCurrency as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY;
              const currencySymbol =
                PRICING_CURRENCY_SYMBOLS[
                  resolvedCurrency as keyof typeof PRICING_CURRENCY_SYMBOLS
                ] ?? resolvedCurrency;
              const overageRates = (TIER_OVERAGE_RATES_BY_CURRENCY[
                currencyKey
              ] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR)[tierName];
              const overageFromRates =
                overageRates?.appointmentRate > 0
                  ? `then ${currencySymbol}${overageRates.appointmentRate}/extra consultation`
                  : undefined;
              const tierOverageHint =
                tierName === "ESSENTIAL"
                  ? `${currencySymbol}0 for the first ${SUBSCRIPTION_TRIAL_DAYS} days, then regular billing`
                  : tierName === "STARTER"
                    ? [
                        "Payment at signup (Razorpay). No unpaid trial on Starter.",
                        overageFromRates,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : tierName === "FRONT_DESK"
                      ? [
                          "Payment required at signup. Clinical workflows stay disabled in-app.",
                          overageFromRates,
                        ]
                          .filter(Boolean)
                          .join(" ")
                    : tierName === "PROFESSIONAL"
                      ? [
                          "Payment required at signup. Unpaid trial is only on Essential.",
                          overageFromRates,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : tierName === "ENTERPRISE"
                        ? "Custom pricing and deployment. Contact sales to continue."
                        : overageFromRates;

              const tierButtonLabel =
                tierName === "ESSENTIAL"
                  ? `Start free ${SUBSCRIPTION_TRIAL_DAYS}-day trial`
                  : tierName === "ENTERPRISE"
                    ? "Contact sales"
                    : "Select and pay";

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
                    keyHighlights={
                      PLAN_ONBOARDING_KEY_HIGHLIGHTS[tierName] ?? []
                    }
                    pricing={cardPricing}
                    billingCycle={billingCycle}
                    currencySymbol={currencySymbol}
                    overageHint={tierOverageHint}
                    buttonLabel={tierButtonLabel}
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
                            if (tierName === "FRONT_DESK") {
                              setWorkspaceProfile("FRONT_DESK");
                            } else {
                              setWorkspaceProfile("FULL_CLINICAL");
                            }
                            handleSelectTier(tierName);
                          }
                    }
                  />
                </div>
              );
            })}
        </div>

        <Collapsible open={comparisonOpen} onOpenChange={setComparisonOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between border border-border/50 rounded-lg px-4 py-3 h-auto"
            >
              <span className="text-sm font-medium">Compare all plans</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  comparisonOpen && "rotate-180",
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ComparisonTable currentTier={0} />
          </CollapsibleContent>
        </Collapsible>

        <ContactSalesModal
          open={showContactSalesModal}
          onOpenChange={setShowContactSalesModal}
          source="onboarding_enterprise"
          defaultValues={{
            message: enterpriseContactMessage,
          }}
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
