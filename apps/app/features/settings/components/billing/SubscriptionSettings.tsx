"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useBillingHistory } from "@/hooks/api/use-billing-history";
import {
  Feature,
  FEATURE_TIER_MAP,
  getTierInfo,
  getTierName,
  Tier,
} from "@/lib/tier-config";
import {
  getWhatsAppAddonPricingByCurrency,
  PRICING_CURRENCY_SYMBOLS,
  TIER_OVERAGE_RATES_BY_CURRENCY,
  type SupportedCurrency,
  type TierName,
} from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useSubscription } from "@/hooks/api/use-settings";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import { ComparisonTable } from "@/features/subscription/components/pricing/comparison-table";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { UsageDashboard } from "@/features/subscription/components/usage-dashboard";
import { LockedFeatures } from "@/features/subscription/components/cards/LockedFeatures";
import { NextTierPromotion } from "@/features/subscription/components/cards/NextTierPromotion";
import { PaymentSuccessModal } from "@/features/subscription/components";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { AlertTriangle, Clock, Download, FileText, Loader2, XCircle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";

function BillingHistory() {
  const { data: invoices, isLoading } = useBillingHistory();

  const handleDownload = (invoiceUrl: string) => {
    window.open(invoiceUrl, "_blank");
  };

  const handleExportCsv = () => {
    if (!invoices || invoices.length === 0) return;

    const header = [
      "Date",
      "Description",
      "Amount",
      "Currency",
      "Status",
      "ReceiptUrl",
    ];

    const rows = invoices.map((invoice) => {
      const formattedDate = new Date(invoice.createdAt).toISOString();
      const description = (invoice.description || "Subscription Payment").replaceAll(
        '"',
        '""',
      );
      const amount = (invoice.amountCents / 100).toFixed(2);
      const currency = invoice.currency || DEFAULT_CURRENCY;
      const status = invoice.status;
      const receipt = invoice.invoiceUrl || "";

      return [
        formattedDate,
        `"${description}"`,
        amount,
        currency,
        status,
        `"${receipt}"`,
      ].join(",");
    });

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `billing-history-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
        <p>No billing history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleExportCsv}
          disabled={!invoices || invoices.length === 0}
        >
          <Download className="h-4 w-4" />
          Export All CSV
        </Button>
      </div>

      <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Receipt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                {new Date(invoice.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground">
                {invoice.description || "Subscription Payment"}
              </TableCell>
              <TableCell>
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: invoice.currency || DEFAULT_CURRENCY,
                }).format(invoice.amountCents / 100)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    invoice.status === "paid"
                      ? "badge-success"
                      : "badge-warning",
                  )}
                >
                  {invoice.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {invoice.invoiceUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(invoice.invoiceUrl!)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}


export function SubscriptionSettings() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { currentTier } = usePermissionStore();
  const { data: subscription, isLoading } = useSubscription();
  const billingHistoryRef = useRef<HTMLDivElement>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<CheckoutSuccessData>({
    planName: "",
  });

  const { currency } = useLocaleCurrency();
  const supportPhone = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER;
  useSubscriptionCheckout((data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <div className="h-4 w-[250px] bg-muted animate-pulse rounded" />
              <div className="h-4 w-[200px] bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierName = subscription?.tierName || "Free Plan";
  const subscriptionStatus = subscription?.subscriptionStatus || "Inactive";
  const billingCycle = subscription?.billingCycle || "monthly";
  const subscriptionCurrency = subscription?.currency || DEFAULT_CURRENCY;
  const basePrice = (subscription?.basePriceCents ?? 0) / 100;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "-";
  const currentTierInfo = getTierInfo(currentTier);
  const currentTierName = getTierName(currentTier) as TierName;

  if (!isAdmin) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="font-bold text-lg">{tierName}</p>
            <Badge variant="secondary" className="capitalize">
              {subscriptionStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Contact your clinic administrator to manage subscription.
          </p>
        </CardContent>
      </Card>
    );
  }

  const lockedFeatures = Object.entries(FEATURE_TIER_MAP)
    .filter(([, requiredTier]) => requiredTier > currentTier && requiredTier !== Tier.INTELLIGENCE)
    .map(([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature),
    }))
    .filter((item) => !item.details.comingSoon);

  const nextTier = currentTier < Tier.ENTERPRISE ? currentTier + 1 : null;
  const featuresByTier = [Tier.STARTER, Tier.ESSENTIAL, Tier.PROFESSIONAL, Tier.ENTERPRISE].map(
    (tier) => ({
      tier,
      features: Object.entries(FEATURE_TIER_MAP)
        .filter(([, rt]) => rt === tier)
        .map(([feature]) => ({
          feature: feature as Feature,
          details: getFeatureDetails(feature as Feature),
        }))
        .filter((item) => !item.details.comingSoon),
    }),
  );

  const currencyKey = (currency || "INR") as keyof typeof TIER_OVERAGE_RATES_BY_CURRENCY;
  const currencySymbol = PRICING_CURRENCY_SYMBOLS[currency as keyof typeof PRICING_CURRENCY_SYMBOLS] ?? "₹";
  const overageRates =
    (TIER_OVERAGE_RATES_BY_CURRENCY[currencyKey] ?? TIER_OVERAGE_RATES_BY_CURRENCY.INR)[currentTierName];
  const whatsappOverageRate =
    currentTierName === "ESSENTIAL" || currentTierName === "PROFESSIONAL"
      ? getWhatsAppAddonPricingByCurrency(
          currentTierName,
          currencyKey as SupportedCurrency,
        ).overageRate
      : 0;

  const trialDaysLeft =
    subscriptionStatus === "TRIALING" && subscription?.currentPeriodEnd
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const isPaymentDue =
    subscriptionStatus === "PAYMENT_DUE" ||
    subscriptionStatus === "PAST_DUE";

  const isExpired = subscriptionStatus === "EXPIRED";

  return (
    <div className="space-y-8">
      {trialDaysLeft !== null && (
        <Alert className="border-info/40 bg-info/10">
          <Clock className="h-4 w-4 text-info" />
          <AlertTitle>Free Trial Active</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your free CORE trial.`
                : "Your free trial ends today."}
              {" "}Add payment details to keep your CORE features.
            </span>
            <Button size="sm" onClick={() => router.push("/upgrade")} className="shrink-0 ml-4">
              Add Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isPaymentDue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Due</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Your payment is overdue. Update your payment method to avoid service interruption.</span>
            <Button size="sm" variant="outline" onClick={() => router.push("/upgrade")} className="shrink-0 ml-4 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10">
              Update Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Trial Expired</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Your free trial has ended. Choose a plan to continue using Docita.</span>
            <Button size="sm" onClick={() => router.push("/upgrade")} className="shrink-0 ml-4 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90">
              Choose a Plan
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-lg overflow-hidden">
        <div className="h-2 bg-linear-to-r from-info to-primary" />
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Current Plan</CardTitle>
          <CardDescription>Manage your subscription and billing</CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="rounded-xl border bg-muted/30 p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">Billing guidance</p>
              <p className="text-sm text-muted-foreground">
                Paid Indian plans need a GSTIN on file before charge. For onboarding and follow-ups, keep the conversation on WhatsApp.
              </p>
            </div>
            <WhatsAppButton
              phoneNumber={supportPhone}
              message="Hi Docita team, I need help with billing and onboarding."
              label="Message support"
              variant="default"
              allowGenericLink
            />
          </div>

          <CurrentPlanCard
            tierInfo={currentTierInfo}
            currentTier={currentTier}
            hasIntelligence={false}
            canChangeTier={isAdmin}
            onChangePlan={() => router.push("/upgrade")}
            onViewBillingHistory={() =>
              billingHistoryRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />

          <div className="space-y-6">
              <div className="bg-muted/30 rounded-xl p-6 border space-y-4">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Active Subscription
                </p>
                <h3 className="text-3xl font-black text-foreground">{tierName}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Billing cycle</p>
                    <p className="font-medium capitalize">
                      {billingCycle.toLowerCase().replace("_", " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Base price</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: subscriptionCurrency,
                      }).format(basePrice)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Current period ends</p>
                    <p className="font-medium">{periodEnd}</p>
                  </div>
                </div>
              </div>

              <UsageDashboard />

              <div className="flex gap-3">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => router.push("/upgrade")}
                >
                  Open Upgrade &amp; Billing
                </Button>
              </div>
          </div>
        </CardContent>
      </Card>

      {lockedFeatures.length > 0 && (
        <LockedFeatures lockedFeatures={lockedFeatures} />
      )}

      {nextTier !== null && (
        <NextTierPromotion
          nextTier={nextTier}
          featuresByTier={featuresByTier}
          onContactSales={() => router.push("/upgrade")}
        />
      )}

      {overageRates && (overageRates.appointmentRate > 0 || overageRates.userRate > 0 || whatsappOverageRate > 0) && (
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overage Rates</CardTitle>
            <CardDescription>Charges applied when you exceed plan limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {overageRates.appointmentRate > 0 && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-lg font-semibold">
                    {currencySymbol}
                    {overageRates.appointmentRate}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">per extra consultation</p>
                </div>
              )}
              {overageRates.userRate > 0 && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-lg font-semibold">
                    {currencySymbol}
                    {overageRates.userRate}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">per extra user/mo</p>
                </div>
              )}
              {whatsappOverageRate > 0 && (
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <p className="text-lg font-semibold">
                    {currencySymbol}
                    {whatsappOverageRate}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">per extra WhatsApp msg</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Full Feature Comparison</CardTitle>
              <CardDescription>
                Your current plan is{" "}
                <span className="font-medium">{currentTierInfo.name}</span>.
                For plan pricing, upgrade, and downgrade options, use the
                Upgrade page.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              className="self-start md:self-auto"
              onClick={() => router.push("/upgrade")}
            >
              Open Upgrade Page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ComparisonTable currentTier={currentTier} />
        </CardContent>
      </Card>

      <Card ref={billingHistoryRef} className="border-none shadow-lg">
        <CardHeader>
          <div>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              View and download past invoices
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BillingHistory />
        </CardContent>
      </Card>

      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        {...successData}
      />
    </div>
  );
}
