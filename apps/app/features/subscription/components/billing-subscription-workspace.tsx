"use client";

import { useCallback, useRef, useState } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { PrivacyPolicyContent, SLAContent } from "@/features/legal";
import { getTierInfo, getTierPricing, Tier } from "@/lib/tier-config";
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
import { Info, Sparkles } from "lucide-react";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import { ComparisonTable } from "@/features/subscription/components/pricing/comparison-table";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { EnterpriseContractCard } from "@/features/subscription/components/cards/enterprise-contract-card";
import { UsageDashboard } from "@/features/subscription/components/usage-dashboard";
import { FaqSection } from "@/features/subscription/components/sections/faq-section";
import { InvoiceHistoryDialog } from "@/features/subscription/components/dialogs/invoice-history-dialog";
import { PaymentSuccessModal } from "@/features/subscription/components/modals/payment-success-modal";
import { TierCard } from "@/features/subscription/components/cards/tier-card";
import { TierChangeDialog } from "@/features/subscription/components/dialogs/tier-change-dialog";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { useCurrentUsage, usePricingConfig } from "@/hooks/api/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { useSubscription } from "@/hooks/api/use-settings";
import {
  ANNUAL_DISCOUNT_PERCENT,
  PRICING_CURRENCY_SYMBOLS,
  TIER_INFO,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  TIER_PRICING_BY_CURRENCY,
  getTierName,
  getWhatsAppAddonPricingByCurrency,
  isFrontDeskWorkspace,
  type SupportedCurrency,
  type TierName,
} from "@workspace/types";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";
import {
  BILLING_USAGE_AND_OVERAGE_EXPLAINER,
  SUBSCRIPTION_GST_INCLUSIVE_NOTICE,
} from "@/features/subscription/lib/billing-display-messages";
import { PLAN_ONBOARDING_KEY_HIGHLIGHTS } from "@/features/subscription/config/plan-onboarding-highlights";
import { getDisplayBillingPeriodEndAndDaysLeft } from "@/features/subscription/lib/billing-period-display";
import { recommendTier } from "@/features/subscription/lib/recommend-tier";
import { Lightbulb } from "lucide-react";

const PLAN_ORDER = [
  Tier.STARTER,
  Tier.FRONT_DESK,
  Tier.ESSENTIAL,
  Tier.PROFESSIONAL,
  Tier.HOSPITAL,
  Tier.ENTERPRISE,
] as const;

function formatPlanDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const formatted = formatLocaleDateShortMonthYear(value);
  return formatted.length > 0 ? formatted : "Not scheduled";
}

function formatStatusLabel(status?: string) {
  if (!status) return "Not set";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isStarterActiveZeroBase(
  subscription: { tier?: string; basePriceCents?: number } | null | undefined,
  subscriptionStatus: string | undefined,
): boolean {
  return (
    subscription?.tier === "STARTER" &&
    subscriptionStatus === "ACTIVE" &&
    (subscription.basePriceCents ?? 0) === 0
  );
}

function starterCatalogListMajorUnits(
  currency: string | undefined,
  billingCycle?: "MONTHLY" | "YEARLY" | string,
): number | null {
  const code = (currency ?? "INR").toUpperCase();
  if (
    !Object.prototype.hasOwnProperty.call(TIER_PRICING_BY_CURRENCY, code)
  ) {
    return null;
  }
  const row =
    TIER_PRICING_BY_CURRENCY[code as SupportedCurrency].STARTER;
  const amount =
    billingCycle === "YEARLY" ? row.yearly : row.monthly;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
}

function billingCadenceLabel(cycle?: "MONTHLY" | "YEARLY" | string) {
  if (!cycle) return "Monthly";
  return cycle === "YEARLY" ? "Annual" : "Monthly";
}

function currencySymbolFor(code: string | undefined) {
  const upper = (code ?? "INR").toUpperCase();
  return (
    PRICING_CURRENCY_SYMBOLS[
      upper as keyof typeof PRICING_CURRENCY_SYMBOLS
    ] ?? upper
  );
}

/**
 * Platform subscription row: always states cadence (monthly vs annual) and list
 * price when the subscription carries a non-zero base.
 */
function formatPlanBillingDetail(
  subscription:
    | {
        tier?: string;
        billingCycle?: "MONTHLY" | "YEARLY";
        basePriceCents?: number;
        currency?: string;
      }
    | null
    | undefined,
  subscriptionStatus: string | undefined,
): string {
  const cadence = billingCadenceLabel(subscription?.billingCycle);
  const symbol = currencySymbolFor(subscription?.currency);

  if (isStarterActiveZeroBase(subscription, subscriptionStatus)) {
    const listMajor = starterCatalogListMajorUnits(
      subscription?.currency,
      subscription?.billingCycle,
    );
    if (listMajor != null) {
      const suffix = subscription?.billingCycle === "YEARLY" ? "/yr" : "/mo";
      return `${cadence} — ${symbol}${listMajor}${suffix}`;
    }
    return `${cadence} — ${symbol}0`;
  }

  const cents = subscription?.basePriceCents ?? 0;
  if (cents <= 0) {
    return `${cadence} — ${symbol}0`;
  }

  const majorUnits = cents / 100;
  const amountLabel = Number.isInteger(majorUnits)
    ? String(majorUnits)
    : majorUnits.toFixed(2);
  const suffix = subscription?.billingCycle === "YEARLY" ? "/yr" : "/mo";
  return `${cadence} — ${symbol}${amountLabel}${suffix}`;
}

/**
 * Legacy rows set Starter to MONTHLY with a ~365d access window; avoid implying
 * a monthly renewal cadence from that combination.
 */
function starterMonthlyAccessTermMismatch(
  subscription: { tier?: string; billingCycle?: string } | null | undefined,
  daysLeftInPeriod: number | null,
): boolean {
  return (
    subscription?.tier === "STARTER" &&
    subscription?.billingCycle === "MONTHLY" &&
    daysLeftInPeriod !== null &&
    daysLeftInPeriod > 45
  );
}

export function BillingSubscriptionWorkspace() {
  const { currentTier, workspaceProfile } = usePermissionStore();
  const isFrontDeskClinic = isFrontDeskWorkspace(workspaceProfile);

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

  const { checkoutTier, isProcessing: isCheckoutProcessing } =
    useSubscriptionCheckout((data) => {
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
  const displayBillingPeriod =
    subscription?.subscriptionStatus === "ACTIVE"
      ? getDisplayBillingPeriodEndAndDaysLeft(subscription)
      : null;
  const planStripPeriodEnd =
    displayBillingPeriod?.periodEnd ?? subscriptionPeriodEnd;
  const planStripDaysLeft =
    displayBillingPeriod?.daysLeft ?? daysLeftInPeriod;
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
  const starterLongMonthlyWindow = starterMonthlyAccessTermMismatch(
    subscription,
    planStripDaysLeft,
  );
  /** Date row label only; do not drive billing copy (paid Starter can have a long prepaid window). */
  const showStarterAccessThroughLabel = starterLongMonthlyWindow;

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

  const planCards = PLAN_ORDER.map((tier) => ({
    tier,
    info: getTierInfo(tier),
  }));

  const recommendation = recommendTier(getTierName(effectiveCurrentTier), usage);

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
              badgeLabel: isTrialExpired ? "Starter" : "Trial Active",
              description: isTrialExpired
                ? "Your trial has ended and your facility is now on the Starter plan. Upgrade to continue paid features."
                : planStripDaysLeft !== null && planStripDaysLeft > 0
                  ? "Upgrade anytime to keep paid features after the trial."
                  : "Your trial ends today. Upgrade anytime to keep paid features active.",
              variant: isTrialExpired
                ? ("warning" as const)
                : ("default" as const),
            }
          : subscriptionStatus === "ACTIVE"
            ? undefined
            : {
                title: "Starter plan",
                badgeLabel: "Starter",
                description:
                  "Your clinic is on the Starter plan. Choose a paid plan when you need higher limits or advanced workflows.",
                variant: "default" as const,
              };

  const planDetails = [
    { label: "Plan", value: currentTierInfo.name },
    { label: "Status", value: formatStatusLabel(subscriptionStatus) },
    {
      label: "Billing",
      value: formatPlanBillingDetail(subscription, subscriptionStatus),
    },
    {
      label:
        isTrialing && !isTrialExpired
          ? "Trial Ends"
          : subscription?.cancelAtPeriodEnd
            ? "Ends On"
            : showStarterAccessThroughLabel
              ? "Access through"
              : "Renews On",
      value:
        planStripPeriodEnd !== null
          ? `${formatPlanDate(planStripPeriodEnd.toISOString())}${
              planStripDaysLeft !== null
                ? ` (${planStripDaysLeft} day${planStripDaysLeft === 1 ? "" : "s"} left)`
                : ""
            }`
          : "Not scheduled",
    },
  ];

  const billingAllowed = true;

  return (
    <div className="space-y-6">
      {subscription?.tier === "ENTERPRISE" && <EnterpriseContractCard />}
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
        showWhatsAppUsageMeter={subscription?.tier !== "STARTER"}
      />

      <p className="w-full max-w-none text-pretty text-[var(--fs-2xs)] leading-relaxed text-muted-foreground">
        {BILLING_USAGE_AND_OVERAGE_EXPLAINER}
      </p>

      <UsageDashboard />

      <div
        ref={plansRef}
        id="billing-plans-section"
        className="scroll-mt-6 space-y-4"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-2">
            <h2 className="ui-section-title text-[var(--fs-xl)]">
              Choose a plan
            </h2>
            <p className="max-w-prose text-[var(--fs-sm)] leading-relaxed text-muted-foreground">
              Select a tier to open a short confirmation step before checkout.
              Each card shows{" "}
              <span className="font-medium text-foreground">
                additional usage
              </span>{" "}
              rates after included limits. Use{" "}
              <span className="font-medium text-foreground">Compare plans</span>{" "}
              below for the full feature matrix.
            </p>
            {isFrontDeskClinic ? (
              <Alert className="mt-3 border-border">
                <Info className="h-4 w-4" aria-hidden />
                <AlertTitle>Commercial tier vs workspace profile</AlertTitle>
                <AlertDescription className="text-[var(--fs-sm)] leading-relaxed">
                  The plans below set subscription limits and pricing. Your
                  facility is on a{" "}
                  <span className="font-medium text-foreground">
                    front desk (appointments and invoices)
                  </span>{" "}
                  workspace: clinical EHR modules stay off unless you move to a
                  full clinical workspace. To change workspace type, use{" "}
                  <span className="font-medium text-foreground">
                    Contact sales
                  </span>{" "}
                  below so we can align billing and access safely.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <div className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border bg-background p-1 sm:self-auto">
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

        {recommendation ? (
          <Alert className="border-primary/40 bg-primary/5">
            <Lightbulb className="h-4 w-4 text-primary" />
            <AlertTitle>
              We suggest {TIER_INFO[recommendation.tier].name} for your usage
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="leading-relaxed">
                Based on this period&apos;s usage we recommend{" "}
                <span className="font-medium text-foreground">
                  {TIER_INFO[recommendation.tier].name}
                </span>
                . Reasons:
              </p>
              <ul className="list-disc space-y-0.5 pl-5 leading-relaxed">
                {recommendation.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() =>
                    handleSelectTier(recommendation.tier, selectedCycle)
                  }
                  disabled={!billingAllowed}
                >
                  Review {TIER_INFO[recommendation.tier].name}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(19rem,1fr))]">
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
        <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground max-w-prose">
          {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
        </p>
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
        checkoutInFlight={isCheckoutProcessing}
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
