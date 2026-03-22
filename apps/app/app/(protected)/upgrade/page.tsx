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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
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
import { usePricingConfig } from "@/hooks/api/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import type { TierName } from "@workspace/types";
import { useAuth } from "@/lib/auth-context";
import { BILLING_ROLES } from "@/lib/permissions";
import {
  PRICING_CURRENCY_SYMBOLS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
} from "@workspace/types";
import { Loader2 } from "lucide-react";

export default function UpgradePage() {
  const { currentTier, hasIntelligence, canAccess } = usePermissionStore();
  const { user } = useAuth();
  const router = useRouter();

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
  const { currency } = useLocaleCurrency();
  const { pricingConfig } = usePricingConfig(currency);

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

  const currentTierName = Tier[currentTier] as TierName;
  const intelligenceAddOn = pricingConfig?.addOns.find(
    (addOn) => addOn.id === "INTELLIGENCE",
  );
  const pricingByTier = intelligenceAddOn?.pricingByTier?.[currentTierName];
  const dynamicIntelligencePricing =
    pricingByTier &&
    typeof pricingByTier.monthly === "number" &&
    typeof pricingByTier.yearly === "number"
      ? {
          monthly: pricingByTier.monthly,
          yearly: pricingByTier.yearly,
        }
      : undefined;

  if (!user || !canAccessPage) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading subscription workspace...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 min-h-screen">
      <div className="mx-auto w-full max-w-6xl space-y-6">
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

        {/* Hero zone */}
        <CurrentPlanCard
          tierInfo={currentTierInfo}
          currentTier={currentTier}
          hasIntelligence={hasIntelligence}
          canChangeTier={canAccessPage}
          onChangePlan={() => setShowPricingDialog(true)}
          onViewBillingHistory={() => setShowInvoiceHistory(true)}
        />

        {/* All Plans grid */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">All Plans &amp; Features</h2>
            <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg self-start sm:self-auto">
              <Button
                variant={selectedCycle === "MONTHLY" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCycle("MONTHLY")}
              >
                Monthly
              </Button>
              <Button
                variant={selectedCycle === "YEARLY" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedCycle("YEARLY")}
              >
                Yearly
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuresByTier
              .filter((t) => t.tier !== Tier.INTELLIGENCE)
              .map(({ tier, info, features }) => {
                const tierName = Tier[tier] as TierName;
                const tierPricingData = pricingConfig?.tiers.find(
                  (t) => t.id === tierName,
                );
                const overageRates =
                  TIER_OVERAGE_RATES_BY_CURRENCY[
                    currency as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY
                  ]?.[tierName] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
                const currencySymbol = PRICING_CURRENCY_SYMBOLS[
                  currency as keyof typeof PRICING_CURRENCY_SYMBOLS
                ] ?? PRICING_CURRENCY_SYMBOLS.INR;
                const overageHint =
                  overageRates?.patientRate > 0
                    ? `then ${currencySymbol}${overageRates.patientRate}/extra patient`
                    : undefined;
                return (
                  <TierCard
                    key={tier}
                    tier={tier}
                    info={info}
                    features={features}
                    isCurrentTier={tier === currentTier}
                    isLocked={tier > currentTier}
                    currentTierValue={currentTier}
                    pricing={tierPricingData?.pricing}
                    billingCycle={selectedCycle}
                    currencySymbol={currencySymbol}
                    overageHint={overageHint}
                    onSelect={
                      canAccessPage
                        ? () => handleSelectTier(tierName, selectedCycle)
                        : undefined
                    }
                  />
                );
              })}
          </div>
        </div>

        {/* Detail zone – tabbed */}
        <Tabs defaultValue="estimator" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-1">
            <TabsTrigger
              value="estimator"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
            >
              Price Estimator
            </TabsTrigger>
            <TabsTrigger
              value="compare"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
            >
              Compare Plans
            </TabsTrigger>
            <TabsTrigger
              value="addons"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
            >
              Add-ons
            </TabsTrigger>
            <TabsTrigger
              value="missing"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
            >
              What You&apos;re Missing
            </TabsTrigger>
            <TabsTrigger
              value="faq"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
            >
              FAQ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estimator" className="pt-4">
            <DynamicPricingEstimator
              defaultTier={currentTierName}
              currency={currency}
            />
          </TabsContent>

          <TabsContent value="compare" className="pt-4">
            <ComparisonTable currentTier={currentTier} />
          </TabsContent>

          <TabsContent value="addons" className="pt-4">
            <AddonsSection
              hasIntelligence={hasIntelligence}
              intelligenceFeatures={intelligenceFeatures}
              purchasingId={processingId}
              currency={currency}
              intelligencePricing={dynamicIntelligencePricing}
              onPurchaseIntelligence={(cycle) =>
                checkoutAddon({
                  addonId: "INTELLIGENCE",
                  billingCycle: cycle,
                  currentTier,
                })
              }
            />
          </TabsContent>

          <TabsContent value="missing" className="pt-4 space-y-6">
            <LockedFeatures lockedFeatures={lockedFeatures} />
            {nextTier !== null && (
              <NextTierPromotion
                nextTier={nextTier}
                featuresByTier={featuresByTier}
                onContactSales={() => setShowContactSalesModal(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="faq" className="pt-4">
            <FaqSection />
          </TabsContent>
        </Tabs>

        <TrustSection />

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

        <div className="text-center text-xs text-muted-foreground pt-2 pb-10">
          <p>
            By upgrading, you agree to our{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            . All prices are inclusive of GST and applicable taxes.
          </p>
        </div>

        <ContactSalesModal
          open={showContactSalesModal}
          onOpenChange={setShowContactSalesModal}
          source="upgrade_page"
        />
        <PricingDialog
          open={showPricingDialog}
          onOpenChange={setShowPricingDialog}
          currentTier={currentTier}
          onSelectTier={handleSelectTier}
          initialCurrency={currency}
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
      </div>
    </div>
  );
}
