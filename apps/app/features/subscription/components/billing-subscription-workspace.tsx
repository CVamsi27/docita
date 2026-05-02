"use client";

import { useCallback, useRef, useState } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { PrivacyPolicyContent, SLAContent } from "@/features/legal";
import {
  Feature,
  FEATURE_TIER_MAP,
  getTierInfo,
  Tier,
} from "@/lib/tier-config";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Sparkles } from "lucide-react";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import { ComparisonTable } from "@/features/subscription/components/pricing/comparison-table";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { FaqSection } from "@/features/subscription/components/sections/faq-section";
import { InvoiceHistoryDialog } from "@/features/subscription/components/dialogs/invoice-history-dialog";
import { PaymentSuccessModal } from "@/features/subscription/components/modals/payment-success-modal";
import { TierCard } from "@/features/subscription/components/cards/tier-card";
import { TierChangeDialog } from "@/features/subscription/components/dialogs/tier-change-dialog";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { useCurrentUsage, usePricingConfig } from "@/hooks/api/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { useSubscription } from "@/hooks/api/use-settings";
import {
  ANNUAL_DISCOUNT_PERCENT,
  type SupportedCurrency,
  type TierName,
} from "@workspace/types";
import {
  PRICING_CURRENCY_SYMBOLS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  getWhatsAppAddonPricingByCurrency,
} from "@workspace/types";
import { formatCountLocale } from "@workspace/utils";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";

const PLAN_ORDER = [
  Tier.STARTER,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.ENTERPRISE,
] as const;

const PLAN_BEST_FOR: Record<TierName, string> = {
  STARTER: "Best for testing Docita or very small practices.",
  ESSENTIAL: "Best for solo clinics ready for billing and messaging.",
  PROFESSIONAL: "Best for multi-doctor clinics with higher throughput.",
  ENTERPRISE: "Best for hospitals and multi-location organizations.",
  INTELLIGENCE: "Best for AI-assisted workflows.",
};

const PLAN_INCLUDED_LABEL: Partial<Record<TierName, string>> = {
  STARTER: "Included foundation",
  ESSENTIAL: "Everything in Starter, plus",
  PROFESSIONAL: "Everything in Essential, plus",
  ENTERPRISE: "Everything in Professional, plus",
};

function formatPlanDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const formatted = formatLocaleDateShortMonthYear(value);
  return formatted.length > 0 ? formatted : "Not scheduled";
}

function formatLimitValue(value?: number) {
  if (value === undefined) return undefined;
  if (value >= 999999 || value === 999) return "Unlimited";
  return formatCountLocale(value);
}

function formatLimitLabel(
  value: number | undefined,
  singular: string,
  plural = `${singular}s`,
) {
  const formattedValue = formatLimitValue(value);
  if (!formattedValue) return undefined;
  const unit = value === 1 ? singular : plural;
  return `${formattedValue} ${unit}`;
}

function formatStatusLabel(status?: string) {
  if (!status) return "Free";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatBillingCycle(cycle?: "MONTHLY" | "YEARLY") {
  if (!cycle) return "Free";
  return cycle === "YEARLY" ? "Yearly" : "Monthly";
}

export function BillingSubscriptionWorkspace() {
  const { currentTier } = usePermissionStore();

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
  const [legalDialog, setLegalDialog] = useState<null | "terms" | "privacy">(
    null,
  );
  const plansRef = useRef<HTMLDivElement>(null);

  const { checkoutTier } = useSubscriptionCheckout((data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
    setShowTierChangeDialog(false);
  });

  const { currency } = useLocaleCurrency();
  const { pricingConfig } = usePricingConfig(currency);
  const { data: subscription } = useSubscription({ enabled: true });
  const {
    usage,
    isLoading: isUsageLoading,
    error: usageError,
  } = useCurrentUsage();

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
  }, [selectedTier, selectedCycle, checkoutTier]);

  const currentTierInfo = getTierInfo(effectiveCurrentTier);
  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const featuresByTier = PLAN_ORDER.map((tier) => ({
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
          : subscriptionStatus === "ACTIVE"
            ? {
                title: "Subscription Active",
                badgeLabel: "Active",
                description:
                  daysLeftInPeriod !== null
                    ? `${daysLeftInPeriod} day${daysLeftInPeriod === 1 ? "" : "s"} remaining in this billing period.`
                    : "Your paid subscription is active.",
                variant: "default" as const,
              }
            : {
                title: "Starter Plan Active",
                badgeLabel: "Free",
                description:
                  "Your clinic is on the Starter plan. Choose a paid plan when you need higher limits or advanced workflows.",
                variant: "default" as const,
              };

  const planDetails = [
    { label: "Plan", value: currentTierInfo.name },
    { label: "Status", value: formatStatusLabel(subscriptionStatus) },
    {
      label: "Billing",
      value: formatBillingCycle(subscription?.billingCycle),
    },
    {
      label:
        isTrialing && !isTrialExpired
          ? "Trial Ends"
          : subscription?.cancelAtPeriodEnd
            ? "Ends On"
            : "Renews On",
      value:
        subscriptionPeriodEnd !== null
          ? `${formatPlanDate(subscription?.currentPeriodEnd)}${
              daysLeftInPeriod !== null
                ? ` (${daysLeftInPeriod} day${daysLeftInPeriod === 1 ? "" : "s"} left)`
                : ""
            }`
          : "Not scheduled",
    },
  ];

  const billingAllowed = true;

  return (
    <div className="space-y-6">
      <CurrentPlanCard
        tierInfo={currentTierInfo}
        currentTier={effectiveCurrentTier}
        hasIntelligence={false}
        canChangeTier={billingAllowed}
        onChangePlan={scrollToPlans}
        onViewBillingHistory={() => setShowInvoiceHistory(true)}
        planDetails={planDetails}
        usage={usage}
        isUsageLoading={isUsageLoading}
        hasUsageError={!!usageError}
        statusNotice={currentPlanStatusNotice}
      />

      <div
        ref={plansRef}
        id="billing-plans-section"
        className="scroll-mt-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="ui-section-title text-[var(--fs-xl)]">
              Choose a plan
            </h2>
            <p className="ui-page-subtitle">
              Select a plan below. The confirmation step appears only after you
              choose one.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border bg-background p-1 self-start sm:self-auto">
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

        {selectedCycle === "YEARLY" && (
          <Alert className="border-success/40 bg-success/10">
            <Sparkles className="h-4 w-4 text-success" />
            <AlertTitle>Save with yearly billing</AlertTitle>
            <AlertDescription>
              Annual plans include roughly {ANNUAL_DISCOUNT_PERCENT}% savings
              compared to twelve monthly payments at list prices (before
              credits or promotions).
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {featuresByTier.map(({ tier, info, features }) => {
            const tierName = Tier[tier] as TierName;
            const tierPricingData = pricingConfig?.tiers.find(
              (t) => t.id === tierName,
            );
            const limits = tierPricingData?.limits;
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
            ].filter((item): item is string => !!item);
            const overageHint =
              overageParts.length > 0
                ? `Overage meters: ${overageParts.join(", ")}`
                : undefined;
            const limitHighlights = [
              formatLimitLabel(limits?.patients, "patient"),
              formatLimitLabel(limits?.doctors, "doctor"),
              limits?.appointments !== undefined
                ? `${formatLimitValue(limits.appointments)} consults/mo`
                : undefined,
              limits?.storage !== undefined
                ? `${formatLimitValue(limits.storage)} GB storage`
                : undefined,
            ].filter((item): item is string => !!item);

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
                overageItems={overageParts}
                bestFor={PLAN_BEST_FOR[tierName]}
                includedLabel={PLAN_INCLUDED_LABEL[tierName]}
                limitHighlights={limitHighlights}
                featureDisplay="detailed"
                maxDisplay={tier === Tier.STARTER ? 4 : 5}
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
            <Button variant="outline" onClick={scrollToPlans}>
              View plans
            </Button>
            <Button onClick={() => setShowContactSalesModal(true)}>
              Contact Sales
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pt-2 pb-6">
        <p>
          By upgrading, you agree to our
          <button
            type="button"
            className="ml-1 underline underline-offset-2 hover:text-foreground"
            onClick={() => setLegalDialog("terms")}
          >
            Terms of Service
          </button>
          <span className="mx-1">and</span>
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => setLegalDialog("privacy")}
          >
            Privacy Policy
          </button>
          . All prices are inclusive of GST and applicable taxes.
        </p>
      </div>

      <Dialog
        open={legalDialog !== null}
        onOpenChange={(open) => {
          if (!open) setLegalDialog(null);
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
              {legalDialog === "privacy" ? (
                <PrivacyPolicyContent />
              ) : null}
              {legalDialog === "terms" ? <SLAContent /> : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
        source="billing_subscription_settings"
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
  );
}
