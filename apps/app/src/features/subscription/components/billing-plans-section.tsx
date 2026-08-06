import { useState } from "react";
import type { PlanMode, TierName } from "@workspace/types";
import { PLAN_ORDER } from "./billing-plan-order";
import { BillingPlansHeader, BillingRecommendationBanner, BillingPlanCards } from "./billing-plans-section-sections";
import type { TierRecommendation } from "../lib/recommend-tier";

type Recommendation = TierRecommendation | null;
type PricingConfig = { tiers: { id: string; pricing: { monthly: number | "custom"; yearly: number | "custom" } }[] } | null | undefined;

interface PlansSectionProps {
  effectiveCurrentTier: number;
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
  effectiveCurrentTier, selectedCycle, setSelectedCycle, recommendation,
  billingAllowed, handleSelectTier, setShowContactSalesModal, pricingConfig, currency, plansRef,
}: PlansSectionProps) {
  const [selectedMode, setSelectedMode] = useState<PlanMode>("FULL");
  const planCards = PLAN_ORDER.map((_tier, i) => ({
    tier: i,
    info: { name: ["Free", "Essential", "Professional", "Hospital", "Enterprise"][i] ?? "", tagline: "", description: "", color: ["gray", "blue", "purple", "blue", "orange"][i] },
  }));

  return (
    <div ref={plansRef} id="billing-plans-section" className="scroll-mt-6 space-y-4">
      <BillingPlansHeader selectedMode={selectedMode} onModeChange={setSelectedMode} selectedCycle={selectedCycle} onCycleChange={setSelectedCycle} />
      <BillingRecommendationBanner recommendation={recommendation} selectedCycle={selectedCycle} billingAllowed={billingAllowed} onSelectTier={handleSelectTier} />
      <BillingPlanCards planCards={planCards} selectedMode={selectedMode} selectedCycle={selectedCycle} pricingConfig={pricingConfig} currency={currency} effectiveCurrentTier={effectiveCurrentTier} recommendation={recommendation} billingAllowed={billingAllowed} onSelectTier={handleSelectTier} onContactSales={() => setShowContactSalesModal(true)} />
    </div>
  );
}
