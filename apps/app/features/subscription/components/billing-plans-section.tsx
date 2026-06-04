"use client";

import { useState } from "react";
import { Tier, getTierInfo } from "@/lib/subscription/tier-access";
import type { PlanMode, TierName } from "@workspace/types";
import { PLAN_ORDER } from "./billing-subscription-helpers";
import type { recommendTier } from "@/features/subscription/lib/recommend-tier";
import {
  BillingPlansHeader,
  BillingRecommendationBanner,
  BillingPlanCards,
} from "./billing-plans-section-sections";

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
      <BillingPlansHeader
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        selectedCycle={selectedCycle}
        onCycleChange={setSelectedCycle}
      />

      <BillingRecommendationBanner
        recommendation={recommendation}
        selectedCycle={selectedCycle}
        billingAllowed={billingAllowed}
        onSelectTier={handleSelectTier}
      />

      <BillingPlanCards
        planCards={planCards}
        selectedMode={selectedMode}
        selectedCycle={selectedCycle}
        pricingConfig={pricingConfig}
        currency={currency}
        effectiveCurrentTier={effectiveCurrentTier}
        recommendation={recommendation}
        billingAllowed={billingAllowed}
        onSelectTier={handleSelectTier}
        onContactSales={() => setShowContactSalesModal(true)}
      />
    </div>
  );
}
