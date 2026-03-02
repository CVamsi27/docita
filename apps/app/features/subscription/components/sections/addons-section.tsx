
"use client";

import { Sparkles } from "lucide-react";
import { AddonCard, type AddonFeature } from "@/features/subscription/components/cards/addon-card";

interface AddonsSectionProps {
  hasIntelligence: boolean;
  intelligenceFeatures: AddonFeature[];
  purchasingId: string | null;
  currency: string;
  intelligencePricing?: {
    monthly: number;
    yearly: number;
  };
  onPurchaseIntelligence: (cycle: "MONTHLY" | "YEARLY") => void;
}

export function AddonsSection({
  hasIntelligence,
  intelligenceFeatures,
  purchasingId,
  currency,
  intelligencePricing,
  onPurchaseIntelligence,
}: AddonsSectionProps) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Available Add-ons</h2>
        <p className="text-sm text-muted-foreground">
          Extend your current plan with optional upgrades
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-1">
        <AddonCard
          title="Docita Intelligence"
          description="AI-Powered Add-on available for any tier. Smarter clinic management."
          icon={Sparkles}
          colorScheme="pink"
          features={intelligenceFeatures}
          isPurchased={hasIntelligence}
          pricing={intelligencePricing ?? { monthly: 499, yearly: 4999 }}
          onPurchase={onPurchaseIntelligence}
          isLoading={purchasingId === "INTELLIGENCE"}
          currency={currency}
        />
      </div>
    </div>
  );
}
