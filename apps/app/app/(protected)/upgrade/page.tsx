"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  Feature,
  FEATURE_TIER_MAP,
  getTierInfo,
  Tier,
} from "@/lib/tier-config";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/page-header";
import { LoadingState } from "@workspace/ui/components/empty-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import {
  ComparisonTable,
  CurrentPlanCard,
  FaqSection,
  InvoiceHistoryDialog,
  PaymentSuccessModal,
  TierCard,
  TierChangeDialog,
  TrialOfferBanner,
  TrustSection,
  UsagePricingCalculator,
} from "@/features/subscription/components";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { LockedFeatures } from "@/features/subscription/components/cards/LockedFeatures";
import { NextTierPromotion } from "@/features/subscription/components/cards/NextTierPromotion";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { usePricingConfig } from "@/hooks/api/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { useSubscription } from "@/hooks/api/use-settings";
import { APP_ACCESS_TARGETS, type SupportedCurrency, type TierName } from "@workspace/types";
import { useAuth } from "@/lib/auth-context";
import {
  PRICING_CURRENCY_SYMBOLS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  getWhatsAppAddonPricingByCurrency,
} from "@workspace/types";
import { BackButton } from "@/components/common/navigation/back-button";

export default function UpgradePage() {
  const { currentTier, canAccess, canAccessTier } = usePermissionStore();
  const { user } = useAuth();
  const router = useRouter();

  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
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
  const plansRef = useRef<HTMLDivElement>(null);

  const { checkoutTier } = useSubscriptionCheckout((data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
    setShowTierChangeDialog(false);
  });

  const canAccessPage = canAccessTarget(
    APP_ACCESS_TARGETS.PAGE_UPGRADE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      canAccessTier,
    },
    "read",
  );
  const { currency } = useLocaleCurrency();
  const { pricingConfig } = usePricingConfig(currency);
  const { data: subscription } = useSubscription({ enabled: canAccessPage });

  const subscriptionStatus = subscription?.subscriptionStatus;
  const subscriptionPeriodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const daysLeftInPeriod =
    subscriptionPeriodEnd !== null
      ? Math.max(
          0,
          Math.ceil(
            (subscriptionPeriodEnd.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;
  const isTrialing = subscriptionStatus === "TRIALING";
  const isTrialExpired =
    isTrialing && subscriptionPeriodEnd !== null
      ? subscriptionPeriodEnd.getTime() <= Date.now()
      : false;
  const isSubscriptionExpired = subscriptionStatus === "EXPIRED";
  const isPaymentPastDue =
    subscriptionStatus === "PAST_DUE" || subscriptionStatus === "PAYMENT_DUE";
  const isInGracePeriod = subscriptionStatus === "GRACE";
  const effectiveCurrentTier = isTrialExpired ? Tier.STARTER : currentTier;

  useEffect(() => {
    if (user && !canAccessPage) {
      router.push("/dashboard");
    }
  }, [user, canAccessPage, router]);

  const handleSelectTier = useCallback(
    (tier: TierName, cycle: "MONTHLY" | "YEARLY") => {
      setSelectedTier(tier);
      setSelectedCycle(cycle);
      setShowTierChangeDialog(true);
    },
    [],
  );

  const handleConfirmTierChange = useCallback(async () => {
    if (!selectedTier) return;
    if (selectedTier === "ENTERPRISE") {
      setShowTierChangeDialog(false);
      setShowContactSalesModal(true);
      return;
    }
    await checkoutTier({ tier: selectedTier, billingCycle: selectedCycle });
  }, [
    selectedTier,
    selectedCycle,
    checkoutTier,
    setShowContactSalesModal,
    setShowTierChangeDialog,
  ]);

  const currentTierInfo = getTierInfo(effectiveCurrentTier);
  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const featuresByTier = Object.values(Tier)
    .filter((t): t is Tier => typeof t === "number")
    .map((tier) => ({
      tier,
      info: getTierInfo(tier),
      features: Object.entries(FEATURE_TIER_MAP)
        .filter(([, requiredTier]) => requiredTier === tier)
        .map(([feature, requiredTier]) => ({
          feature: feature as Feature,
          details: getFeatureDetails(feature as Feature),
          hasAccess: effectiveCurrentTier >= requiredTier,
        }))
        .filter((entry) => entry.details.isGenerallyAvailable),
    }));

  const lockedFeatures = Object.entries(FEATURE_TIER_MAP)
    .filter(([, requiredTier]) => requiredTier > effectiveCurrentTier)
    .map(([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature),
    }))
    .filter((entry) => entry.details.isGenerallyAvailable);

  const plannedFeatures = Object.entries(FEATURE_TIER_MAP)
    .map(([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature),
    }))
    .filter((entry) => !entry.details.isGenerallyAvailable)
    .sort((a, b) => a.requiredTier - b.requiredTier);

  const nextTier =
    effectiveCurrentTier < Tier.ENTERPRISE ? effectiveCurrentTier + 1 : null;
  const currentPlanStatusNotice = isSubscriptionExpired
    ? {
        title: "Subscription Expired",
        badgeLabel: "Workspace Locked",
        description:
          "Your facility is locked because the subscription has expired. Choose a plan and complete payment to restore access.",
        actionLabel: "Choose a Plan",
        onAction: scrollToPlans,
        variant: "destructive" as const,
      }
    : isInGracePeriod
      ? {
          title: "Payment Grace Period",
          badgeLabel: "Access Restricted",
          description:
            "Your subscription is in grace period after a missed payment. Complete payment now to prevent the workspace from being locked.",
          actionLabel: "Resolve Payment",
          onAction: scrollToPlans,
          variant: "warning" as const,
        }
      : isPaymentPastDue
        ? {
            title: "Payment Past Due",
            badgeLabel: "Action Required",
            description:
              "Your payment is overdue. Complete payment to keep Docita access active.",
            actionLabel: "Resolve Payment",
            onAction: scrollToPlans,
            variant: "warning" as const,
          }
        : isTrialing || isTrialExpired
          ? {
              title: isTrialExpired ? "Trial Ended" : "Trial In Progress",
              badgeLabel: isTrialExpired ? "Free Plan" : "Trial Active",
              description: isTrialExpired
                ? "Your trial has ended and your facility is now on the Free plan. Upgrade to continue paid features."
                : daysLeftInPeriod !== null && daysLeftInPeriod > 0
                  ? `${daysLeftInPeriod} day${daysLeftInPeriod !== 1 ? "s" : ""} left in your trial. Upgrade anytime to keep paid features active.`
                  : "Your trial ends today. Upgrade anytime to keep paid features active.",
              variant: isTrialExpired
                ? ("warning" as const)
                : ("default" as const),
            }
          : undefined;

  if (!user || !canAccessPage) {
    return (
      <AppPageScaffold
        header={
          <div className="space-y-2">
            <BackButton
              fallback="/settings?tab=subscription"
              label="Back"
              className="-ml-2"
            />
            <PageHeader
              title="Upgrade your plan"
              description="Review your current plan, compare options, and complete checkout from one page."
            />
          </div>
        }
      >
        <LoadingState
          message="Loading subscription workspace..."
          className="min-h-[40vh]"
        />
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold
      header={
        <div className="space-y-2">
          <BackButton
            fallback="/settings?tab=subscription"
            label="Back"
            className="-ml-2"
          />
          <PageHeader
            title="Upgrade your plan"
            description="Review your current plan, compare options, and complete checkout from one page."
          />
        </div>
      }
    >
      <div className="space-y-6">
        <TrialOfferBanner
          actionLabel="View Essential trial"
          onAction={scrollToPlans}
        />

        <CurrentPlanCard
          tierInfo={currentTierInfo}
          currentTier={effectiveCurrentTier}
          hasIntelligence={false}
          canChangeTier={canAccessPage}
          onChangePlan={scrollToPlans}
          onViewBillingHistory={() => setShowInvoiceHistory(true)}
          statusNotice={currentPlanStatusNotice}
        />

        <div ref={plansRef} className="scroll-mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Choose a plan</h2>
              <p className="text-sm text-muted-foreground">
                Select a plan below. The confirmation step appears only after
                you choose one.
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-xl border bg-background p-1 self-start sm:self-auto">
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuresByTier
              .filter(
                (t) => t.tier !== Tier.INTELLIGENCE && t.tier !== Tier.ENTERPRISE,
              )
              .map(({ tier, info, features }) => {
                const tierName = Tier[tier] as TierName;
                const tierPricingData = pricingConfig?.tiers.find(
                  (t) => t.id === tierName,
                );
                const overageRates =
                  TIER_OVERAGE_RATES_BY_CURRENCY[
                    currency as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY
                  ]?.[tierName] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
                const currencySymbol =
                  PRICING_CURRENCY_SYMBOLS[
                    currency as keyof typeof PRICING_CURRENCY_SYMBOLS
                  ] ?? PRICING_CURRENCY_SYMBOLS.INR;
                const whatsappRate =
                  tierName === "ESSENTIAL" || tierName === "PROFESSIONAL"
                    ? getWhatsAppAddonPricingByCurrency(
                        tierName,
                        currency as Parameters<
                          typeof getWhatsAppAddonPricingByCurrency
                        >[1],
                      ).overageRate
                    : 0;
                const overageParts = [
                  overageRates?.appointmentRate > 0
                    ? `${currencySymbol}${overageRates.appointmentRate}/consult`
                    : null,
                  overageRates?.userRate > 0
                    ? `${currencySymbol}${overageRates.userRate}/user`
                    : null,
                  whatsappRate > 0
                    ? `${currencySymbol}${whatsappRate}/WA msg`
                    : null,
                ].filter(Boolean);
                const overageHint =
                  overageParts.length > 0
                    ? `Overage meters: ${overageParts.join(" | ")}`
                    : undefined;
                return (
                  <TierCard
                    key={tier}
                    tier={tier}
                    info={info}
                    features={features}
                    isCurrentTier={tier === effectiveCurrentTier}
                    isLocked={false}
                    currentTierValue={effectiveCurrentTier}
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

          {(() => {
            const enterprise = featuresByTier.find((t) => t.tier === Tier.ENTERPRISE);
            if (!enterprise) return null;

            const tierName = "ENTERPRISE" as TierName;
            const tierPricingData = pricingConfig?.tiers.find((t) => t.id === tierName);
            const overageRates =
              TIER_OVERAGE_RATES_BY_CURRENCY[
                currency as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY
              ]?.[tierName] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR[tierName];
            const currencySymbol =
              PRICING_CURRENCY_SYMBOLS[
                currency as keyof typeof PRICING_CURRENCY_SYMBOLS
              ] ?? PRICING_CURRENCY_SYMBOLS.INR;
            const whatsappRate = getWhatsAppAddonPricingByCurrency(
              "ENTERPRISE",
              currency as Parameters<typeof getWhatsAppAddonPricingByCurrency>[1],
            ).overageRate;
            const overageParts = [
              overageRates?.appointmentRate > 0
                ? `${currencySymbol}${overageRates.appointmentRate}/consult`
                : null,
              overageRates?.userRate > 0
                ? `${currencySymbol}${overageRates.userRate}/user`
                : null,
              whatsappRate > 0 ? `${currencySymbol}${whatsappRate}/WA msg` : null,
            ].filter(Boolean);
            const overageHint =
              overageParts.length > 0
                ? `Overage meters: ${overageParts.join(" | ")}`
                : undefined;

            return (
              <div className="pt-4">
                <div className="mx-auto w-full max-w-5xl">
                  <TierCard
                    tier={Tier.ENTERPRISE}
                    info={enterprise.info}
                    features={enterprise.features}
                    isCurrentTier={Tier.ENTERPRISE === effectiveCurrentTier}
                    isLocked={false}
                    currentTierValue={effectiveCurrentTier}
                    pricing={tierPricingData?.pricing}
                    billingCycle={selectedCycle}
                    currencySymbol={currencySymbol}
                    overageHint={overageHint}
                    onSelect={
                      canAccessPage
                        ? () => handleSelectTier(tierName, selectedCycle)
                        : undefined
                    }
                    className="w-full"
                  />
                </div>
              </div>
            );
          })()}
        </div>

        {plannedFeatures.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Planned Roadmap</h2>
                <Badge variant="outline">
                  Not included in today&apos;s access
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {plannedFeatures.map((entry) => (
                  <Badge key={entry.feature} variant="secondary">
                    {entry.details.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="compare" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsTrigger
              value="compare"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
            >
              Compare Plans
            </TabsTrigger>
            <TabsTrigger
              value="calculator"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2"
            >
              Pricing Calculator
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

          <TabsContent value="compare" className="pt-4">
            <ComparisonTable currentTier={effectiveCurrentTier} />
          </TabsContent>

          <TabsContent value="calculator" className="pt-4">
            <UsagePricingCalculator
              currency={
                currency as Parameters<
                  typeof UsagePricingCalculator
                >[0]["currency"]
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

        <Card className="border-border/70 bg-card">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
            <div>
              <h3 className="text-lg font-semibold">Need help choosing?</h3>
              <p className="text-sm text-muted-foreground">
                Our team can help you find the perfect plan for your practice
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={scrollToPlans}>
                View plans
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
        <TierChangeDialog
          open={showTierChangeDialog}
          onOpenChange={setShowTierChangeDialog}
          currentTier={effectiveCurrentTier}
          selectedTier={selectedTier}
          billingCycle={selectedCycle}
          currency={currency as SupportedCurrency}
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
          onResolvePayment={() => {
            setShowInvoiceHistory(false);
            scrollToPlans();
          }}
        />
      </div>
    </AppPageScaffold>
  );
}
