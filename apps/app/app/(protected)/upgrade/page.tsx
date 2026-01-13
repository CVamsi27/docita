"use client";

import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  Feature,
  FEATURE_TIER_MAP,
  getTierInfo,
  Tier,
} from "@/lib/tier-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import {
  Sparkles,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { TierCard } from "@/features/subscription/components/TierCard";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { LockedFeatures } from "@/features/subscription/components/cards/LockedFeatures";
import { NextTierPromotion } from "@/features/subscription/components/cards/NextTierPromotion";
import { IntelligenceAddon } from "@/features/subscription/components/cards/IntelligenceAddon";

export default function UpgradePage() {
  const { currentTier, hasIntelligence, canAccess } = usePermissionStore();
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);

  // Get all features grouped by tier
  const featuresByTier = Object.values(Tier)
    .filter((t): t is Tier => typeof t === "number")
    .map((tier) => ({
      tier,
      info: getTierInfo(tier),
      features: Object.entries(FEATURE_TIER_MAP)
        .filter(([, requiredTier]) => requiredTier === tier)
        .map(([feature]) => ({
          feature: feature as Feature,
          details: getFeatureDetails(feature as Feature),
          hasAccess: canAccess(feature as Feature),
        })),
    }));

  // Get locked features for current tier
  const lockedFeatures = Object.entries(FEATURE_TIER_MAP)
    .filter(([feature]) => !canAccess(feature as Feature))
    .map(([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature),
    }));

  const nextTier = currentTier < Tier.ENTERPRISE ? currentTier + 1 : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upgrade Your Plan</h1>
        <p className="text-muted-foreground">
          Unlock powerful features to grow your practice
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Current Plan: {getTierInfo(currentTier).name}
              </CardTitle>
              <CardDescription>
                {getTierInfo(currentTier).description}
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-sm",
                getTierInfo(currentTier).color === "gray" &&
                  "bg-gray-100 text-gray-700",
                getTierInfo(currentTier).color === "blue" &&
                  "bg-blue-100 text-blue-700",
                getTierInfo(currentTier).color === "green" &&
                  "bg-green-100 text-green-700",
                getTierInfo(currentTier).color === "purple" &&
                  "bg-purple-100 text-purple-700",
                getTierInfo(currentTier).color === "orange" &&
                  "bg-orange-100 text-orange-700",
              )}
            >
              Tier {currentTier}
            </Badge>
          </div>
        </CardHeader>
        {hasIntelligence && (
          <CardContent>
            <div className="flex items-center gap-2 text-pink-600">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">
                Intelligence Add-on Active
              </span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Locked Features Summary */}
      <LockedFeatures lockedFeatures={lockedFeatures} />

      {/* Next Tier Promotion */}
      {nextTier !== null && (
        <NextTierPromotion
          nextTier={nextTier}
          featuresByTier={featuresByTier}
          onContactSales={() => setShowContactSalesModal(true)}
        />
      )}

      {/* Intelligence Add-on */}
      {!hasIntelligence && (
        <IntelligenceAddon featuresByTier={featuresByTier} />
      )}

      {/* All Tiers Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Plans & Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuresByTier
            .filter((t) => t.tier !== Tier.INTELLIGENCE)
            .map(({ tier, info, features }) => (
              <TierCard
                key={tier}
                tier={tier}
                info={info}
                features={features}
                isCurrentTier={tier === currentTier}
                isLocked={tier > currentTier}
              />
            ))}
        </div>
      </div>

      {/* Contact CTA */}
      <Card className="bg-linear-to-r from-primary/10 to-primary/5">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
          <div>
            <h3 className="text-lg font-semibold">Need help choosing?</h3>
            <p className="text-sm text-muted-foreground">
              Our team can help you find the perfect plan for your practice
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">View Pricing</Button>
            <Button onClick={() => setShowContactSalesModal(true)}>
              Contact Sales
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Sales Modal */}
      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
      />
    </div>
  );
}
