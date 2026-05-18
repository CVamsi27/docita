"use client";

import { Tier, getTierInfo, getTierPricing } from "@/lib/subscription/tier-access";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { ScrollArea } from "@workspace/ui/components/layout/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import { Lightbulb } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { PrivacyPolicyContent, SLAContent } from "@/features/legal";
import { ComparisonTable } from "@/features/subscription/components/pricing/comparison-table";
import { FaqSection } from "@/features/subscription/components/sections/faq-section";
import { TierCard } from "@/features/subscription/components/cards/tier-card";
import { ANNUAL_DISCOUNT_PERCENT, PRICING_CURRENCY_SYMBOLS, TIER_INFO, TIER_OVERAGE_RATES_BY_CURRENCY, type TierName, isFrontDeskWorkspace } from "@workspace/types";
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
  const isFrontDeskClinic = isFrontDeskWorkspace(workspaceProfile);

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
          const tierName = Tier[tier] as TierName;
          const tierPricingData = pricingConfig?.tiers.find(
            (t) => t.id === tierName,
          );
          const catalogPricing = getTierPricing(tierName);
          const resolvedPricing =
            tierPricingData?.pricing ?? {
              monthly: catalogPricing.monthly,
              yearly: catalogPricing.yearly,
            };
          const currencySymbol =
            PRICING_CURRENCY_SYMBOLS[
              currency as keyof typeof PRICING_CURRENCY_SYMBOLS
            ] ?? PRICING_CURRENCY_SYMBOLS.INR;
          const overageRates =
            TIER_OVERAGE_RATES_BY_CURRENCY[
              currency as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY
            ]?.[tierName] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
          const whatsappRate =
            tierName === "ESSENTIAL" ||
            tierName === "FRONT_DESK" ||
            tierName === "PROFESSIONAL" ||
            tierName === "HOSPITAL"
              ? getWhatsAppAddonPricingByCurrency(
                  tierName,
                  currency as Parameters<
                    typeof getWhatsAppAddonPricingByCurrency
                  >[1],
                ).overageRate
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

interface PlanTabsSectionProps {
  effectiveCurrentTier: Tier;
}

export function PlanTabsSection({ effectiveCurrentTier }: PlanTabsSectionProps) {
  return (
    <Tabs defaultValue="compare" className="w-full">
      <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-1 flex flex-wrap overflow-x-hidden">
        <TabsTrigger
          value="compare"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
        >
          Compare Plans
        </TabsTrigger>
        <TabsTrigger
          value="faq"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
        >
          FAQ
        </TabsTrigger>
      </TabsList>

      <TabsContent value="compare" className="pt-4">
        <ComparisonTable currentTier={effectiveCurrentTier} />
      </TabsContent>

      <TabsContent value="faq" className="pt-4">
        <FaqSection />
      </TabsContent>
    </Tabs>
  );
}

interface ContactSalesCardProps {
  onContactSales: () => void;
}

export function ContactSalesCard({ onContactSales }: ContactSalesCardProps) {
  return (
    <Card className="border-border/70 bg-card">
      <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
        <div>
          <h3 className="ui-section-title text-[var(--fs-lg)]">
            Need help choosing?
          </h3>
          <p className="ui-page-subtitle">
            Our team can help you find the perfect plan for your practice
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onContactSales}>Contact Sales</Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface LegalFooterProps {
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export function LegalFooter({ onOpenTerms, onOpenPrivacy }: LegalFooterProps) {
  return (
    <div className="text-center text-xs text-muted-foreground pt-2 pb-6">
      <p>
        By upgrading, you agree to our
        <button
          type="button"
          className="ml-1 underline underline-offset-2 hover:text-foreground"
          onClick={onOpenTerms}
        >
          Terms of Service
        </button>
        <span className="mx-1">and</span>
        <button
          type="button"
          className="underline underline-offset-2 hover:text-foreground"
          onClick={onOpenPrivacy}
        >
          Privacy Policy
        </button>
        . All prices are inclusive of GST and applicable taxes.
      </p>
    </div>
  );
}

interface LegalDialogProps {
  legalDialog: null | "terms" | "privacy";
  onClose: () => void;
}

export function LegalDialog({ legalDialog, onClose }: LegalDialogProps) {
  return (
    <Dialog
      open={legalDialog !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {legalDialog === "privacy" ? "Privacy Policy" : "Terms"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(85vh-84px)] px-6 pb-6">
          <div className="pt-2">
            {legalDialog === "privacy" ? <PrivacyPolicyContent /> : null}
            {legalDialog === "terms" ? <SLAContent /> : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
