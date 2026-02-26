"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  Feature,
  FEATURE_TIER_MAP,
  getTierInfo,
  Tier,
} from "@/lib/tier-config";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import {
  AddonsSection,
  ComparisonTable,
  CurrentPlanCard,
  FaqSection,
  InvoiceHistoryDialog,
  PaymentSuccessModal,
  PricingDialog,
  TierCard,
  TierChangeDialog,
  TrustSection,
} from "@/features/subscription/components";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { LockedFeatures } from "@/features/subscription/components/cards/LockedFeatures";
import { NextTierPromotion } from "@/features/subscription/components/cards/NextTierPromotion";
import { DynamicPricingEstimator } from "@/features/subscription/components/pricing/dynamic-pricing-estimator";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import type { TierName } from "@workspace/types";
import { useAuth } from "@/lib/auth-context";
import { BILLING_ROLES } from "@/lib/permissions";

export default function UpgradePage() {
  const { currentTier, hasIntelligence, canAccess } = usePermissionStore();
  const { user } = useAuth();
  const router = useRouter();

  // Dialog / modal state
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<CheckoutSuccessData>({
    planName: "",
  });
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);

  const { checkoutTier, checkoutAddon, processingId } = useSubscriptionCheckout(
    (data) => {
      setSuccessData(data);
      setShowSuccessModal(true);
      if (!data.isAddon) setShowTierChangeDialog(false);
    },
  );

  const canAccessPage = !!user && BILLING_ROLES.has(user.role);

  useEffect(() => {
    if (user && !canAccessPage) {
      router.push("/dashboard");
    }
  }, [user, canAccessPage, router]);

  const handleSelectTier = useCallback(
    (tier: TierName, cycle: "MONTHLY" | "YEARLY") => {
      setSelectedTier(tier);
      setSelectedCycle(cycle);
      setShowPricingDialog(false);
      setShowTierChangeDialog(true);
    },
    [],
  );

  const handleConfirmTierChange = useCallback(async () => {
    if (!selectedTier) return;
    await checkoutTier({ tier: selectedTier, billingCycle: selectedCycle });
  }, [selectedTier, selectedCycle, checkoutTier]);

  // Derived data
  const currentTierInfo = getTierInfo(currentTier);

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

  const lockedFeatures = Object.entries(FEATURE_TIER_MAP)
    .filter(([feature]) => !canAccess(feature as Feature))
    .map(([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature),
    }));

  const nextTier = currentTier < Tier.ENTERPRISE ? currentTier + 1 : null;

  const intelligenceFeatures =
    featuresByTier
      .find((t) => t.tier === Tier.INTELLIGENCE)
      ?.features.map((f) => ({ feature: f.feature, details: f.details })) ?? [];

  // Don't render page for non-admins (while redirecting)
  if (!user || !canAccessPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 min-h-screen">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-1 border-b">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Upgrade Your Plan
            </h1>
            <p className="text-muted-foreground">
              Choose a plan that fits your clinic now and scale when needed.
            </p>
          </div>
        </div>

        {/* Current Plan — SRP: display only */}
        <CurrentPlanCard
          tierInfo={currentTierInfo}
          currentTier={currentTier}
          hasIntelligence={hasIntelligence}
          canChangeTier={canAccessPage}
          onChangePlan={() => setShowPricingDialog(true)}
          onViewBillingHistory={() => setShowInvoiceHistory(true)}
        />

        {/* Trust signals */}
        <TrustSection />

        {/* Locked features summary */}
        <LockedFeatures lockedFeatures={lockedFeatures} />

        {/* Next tier promotion */}
        {nextTier !== null && (
          <NextTierPromotion
            nextTier={nextTier}
            featuresByTier={featuresByTier}
            onContactSales={() => setShowContactSalesModal(true)}
          />
        )}

        {/* Add-ons — SRP: addon UI only */}
        <AddonsSection
          hasIntelligence={hasIntelligence}
          intelligenceFeatures={intelligenceFeatures}
          purchasingId={processingId}
          currency="INR"
          onPurchaseIntelligence={(cycle) =>
            checkoutAddon({
              addonId: "INTELLIGENCE",
              billingCycle: cycle,
              currentTier,
            })
          }
        />

        <DynamicPricingEstimator />

        {/* All Tiers Comparison */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">All Plans &amp; Features</h2>
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
                  currentTierValue={currentTier}
                  onSelect={
                    canAccessPage
                      ? () =>
                          handleSelectTier(Tier[tier] as TierName, "MONTHLY")
                      : undefined
                  }
                />
              ))}
          </div>
        </div>

        {/* Detailed comparison table */}
        <ComparisonTable currentTier={currentTier} />

        {/* Contact CTA */}
        <Card className="bg-linear-to-r from-primary/10 via-primary/5 to-background dark:from-primary/20 dark:via-primary/10 dark:to-slate-900/50 border-primary/20">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div>
              <h3 className="text-lg font-semibold">Need help choosing?</h3>
              <p className="text-sm text-muted-foreground">
                Our team can help you find the perfect plan for your practice
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPricingDialog(true)}
              >
                View Pricing
              </Button>
              <Button onClick={() => setShowContactSalesModal(true)}>
                Contact Sales
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <ContactSalesModal
          open={showContactSalesModal}
          onOpenChange={setShowContactSalesModal}
        />
        <PricingDialog
          open={showPricingDialog}
          onOpenChange={setShowPricingDialog}
          currentTier={currentTier}
          onSelectTier={handleSelectTier}
        />
        <TierChangeDialog
          open={showTierChangeDialog}
          onOpenChange={setShowTierChangeDialog}
          currentTier={currentTier}
          selectedTier={selectedTier}
          onConfirm={handleConfirmTierChange}
        />
        <PaymentSuccessModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          {...successData}
        />
        <InvoiceHistoryDialog
          open={showInvoiceHistory}
          onOpenChange={setShowInvoiceHistory}
        />

        {/* Legal */}
        <div className="max-w-4xl mx-auto text-center text-xs text-muted-foreground pt-4 pb-2">
          <p>
            By upgrading, you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            .<br />
            All prices are inclusive of GST and applicable taxes.
          </p>
        </div>

        {/* FAQ */}
        <div className="pb-10">
          <FaqSection />
        </div>
      </div>
    </div>
  );
}
