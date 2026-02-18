"use client";

/**
 * UpgradePage
 *
 * Thin orchestration layer following SOLID principles:
 *  - SRP: payment logic → useSubscriptionCheckout hook
 *         plan card UI → CurrentPlanCard component
 *         addons UI → AddonsSection component
 *         tier cards UI → TierCard component (existing)
 *  - OCP: new payment methods / add-ons extend hooks & components without
 *         modifying this file
 *  - Access control: ADMIN / ADMIN_DOCTOR only (redirects others)
 */

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
import { PricingDialog } from "@/features/subscription/components/PricingDialog";
import { TierChangeDialog } from "@/features/subscription/components/TierChangeDialog";
import { TierCard } from "@/features/subscription/components/TierCard";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { LockedFeatures } from "@/features/subscription/components/cards/LockedFeatures";
import { NextTierPromotion } from "@/features/subscription/components/cards/NextTierPromotion";
import { CurrentPlanCard } from "@/features/subscription/components/CurrentPlanCard";
import { AddonsSection } from "@/features/subscription/components/AddonsSection";
import { TrustSection } from "@/features/subscription/components/TrustSection";
import { FaqSection } from "@/features/subscription/components/FaqSection";
import { ComparisonTable } from "@/features/subscription/components/ComparisonTable";
import { PaymentSuccessModal } from "@/features/subscription/components/PaymentSuccessModal";
import { InvoiceHistoryDialog } from "@/features/subscription/components/InvoiceHistoryDialog";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import type { TierName } from "@workspace/types";
import { useAuth } from "@/lib/auth-context";
import { useClinic } from "@/lib/clinic-context";
import { usePricingConfig } from "@/hooks/api/use-pricing";
import { BILLING_ROLES } from "@/lib/permissions";

export default function UpgradePage() {
  const { currentTier, hasIntelligence, canAccess } = usePermissionStore();
  const { user } = useAuth();
  const router = useRouter();
  const { clinic } = useClinic();
  const { pricingConfig } = usePricingConfig("INR");

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

  // Payment orchestration — extracted to custom hook (SRP)
  const { checkoutTier, checkoutAddon, processingId } =
    useSubscriptionCheckout((data) => {
      setSuccessData(data);
      setShowSuccessModal(true);
      if (!data.isAddon) setShowTierChangeDialog(false);
    });

  // Access control
  const canAccessPage = !!user && BILLING_ROLES.has(user.role);

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (user && !canAccessPage) {
      router.push("/dashboard");
    }
  }, [user, canAccessPage, router]);

  // Handlers
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
      ?.features.map((f) => ({ feature: f.feature, details: f.details })) ??
    [];

  // WhatsApp pricing
  const hasWhatsApp =
    !!clinic?.features?.["WHATSAPP"] || !!clinic?.whatsappAutomation?.enabled;
  const tierKey = currentTierInfo.name.toUpperCase();
  const whatsappAddon = pricingConfig?.addOns?.find(
    (a) => a.id === "WHATSAPP" || a.name?.toLowerCase().includes("whatsapp"),
  );
  const waTierPricing = whatsappAddon?.pricingByTier?.[tierKey];
  const whatsappPrice = waTierPricing
    ? Number(waTierPricing.monthly) || 799
    : (whatsappAddon?.pricing?.monthly ?? 799);

  // Don't render page for non-admins (while redirecting)
  if (!user || !canAccessPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 bg-linear-to-br from-background via-background to-muted/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
            Upgrade Your Plan
          </h1>
          <p className="text-muted-foreground">
            Unlock powerful features to grow your practice
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
        hasWhatsApp={hasWhatsApp}
        intelligenceFeatures={intelligenceFeatures}
        whatsappPrice={whatsappPrice}
        purchasingId={processingId}
        currency={pricingConfig?.currency?.code ?? "INR"}
        onPurchaseIntelligence={(cycle) =>
          checkoutAddon({
            addonId: "INTELLIGENCE",
            billingCycle: cycle,
            currentTier,
          })
        }
        onPurchaseWhatsApp={(cycle) =>
          checkoutAddon({
            addonId: "WHATSAPP",
            billingCycle: cycle,
            currentTier,
          })
        }
      />

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
          Prices are exclusive of applicable taxes. Tax breakdown will be shown
          at checkout.
        </p>
      </div>

      {/* FAQ */}
      <div className="pb-10">
        <FaqSection />
      </div>
    </div>
  );
}

