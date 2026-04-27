"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useBillingHistory } from "@/hooks/api/use-billing-history";
import { getTierInfo } from "@/lib/tier-config";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useSubscription } from "@/hooks/api/use-settings";
import {
  type CheckoutSuccessData,
  useSubscriptionCheckout,
} from "@/hooks/use-subscription-checkout";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import { getSupportPhoneNumber } from "@/lib/support-contact";
import { CurrentPlanCard } from "@/features/subscription/components/cards/current-plan-card";
import { PaymentSuccessModal } from "@/features/subscription/components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { Badge } from "@workspace/ui/components/badge";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import {
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { BillingHistoryTable } from "@/features/subscription/components/billing/BillingHistoryTable";

function BillingHistory() {
  const { data: invoices, isLoading } = useBillingHistory();
  return <BillingHistoryTable invoices={invoices} isLoading={isLoading} />;
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

  const supportPhone = getSupportPhoneNumber();

  useSubscriptionCheckout((data) => {
    setSuccessData(data);
    setShowSuccessModal(true);
  });

  if (isLoading) {
    return (
      <Card >
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="space-y-2">
              <div className="h-4 w-[250px] rounded bg-muted animate-pulse" />
              <div className="h-4 w-[200px] rounded bg-muted animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierName = subscription?.tier
    ? getTierInfo(subscription.tier).name
    : "Free Plan";
  const subscriptionStatus = subscription?.subscriptionStatus || "Inactive";
  const billingCycle = subscription?.billingCycle || "monthly";
  const subscriptionCurrency = subscription?.currency || DEFAULT_CURRENCY;
  const basePrice = (subscription?.basePriceCents ?? 0) / 100;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "-";
  const currentTierInfo = getTierInfo(currentTier);

  if (!isAdmin) {
    return (
      <Card >
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">{tierName}</p>
            <Badge variant="secondary" className="capitalize">
              {subscriptionStatus}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Contact your facility administrator to manage subscription.
          </p>
        </CardContent>
      </Card>
    );
  }

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
    subscriptionStatus === "PAYMENT_DUE" || subscriptionStatus === "PAST_DUE";
  const isExpired = subscriptionStatus === "EXPIRED";

  return (
    <div className="space-y-6">
      {trialDaysLeft !== null && (
        <Alert className="border-info/40 bg-info/10">
          <Clock className="h-4 w-4 text-info" />
          <AlertTitle>Free Trial Active</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your free CORE trial.`
                : "Your free trial ends today"}{" "}
              Add payment details to keep your CORE features.
            </span>
            <Button
              size="sm"
              onClick={() => router.push("/upgrade")}
              className="shrink-0"
            >
              Add Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isPaymentDue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment Due</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your payment is overdue. Update your payment method to avoid
              service interruption.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/upgrade")}
              className="shrink-0 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
            >
              Update Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Trial Expired</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your free trial has ended. Choose a plan to continue using
              Docita.
            </span>
            <Button
              size="sm"
              onClick={() => router.push("/upgrade")}
              className="shrink-0 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
            >
              Choose a Plan
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Billing &amp; Subscription</CardTitle>
          <CardDescription>
            Your active plan summary, billing cycle, and receipts
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div className="space-y-1">
              <p className="font-semibold">Billing guidance</p>
              <p className="text-sm text-muted-foreground">
                For the complete feature comparison and every other plan detail,
                open the Upgrade page.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => router.push("/upgrade")}>
                View plans
              </Button>
              <WhatsAppButton
                phoneNumber={supportPhone}
                message="Hi Docita team, I need help with billing and onboarding"
                label="Message support"
                variant="default"
              />
            </div>
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

          <div className="rounded-xl border bg-background/60 p-4 md:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Billing cycle</p>
                <p className="font-medium capitalize">
                  {humanizeUiLabel(billingCycle)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base price</p>
                <p className="font-medium">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: subscriptionCurrency,
                  }).format(basePrice)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Current period ends
                </p>
                <p className="font-medium">{periodEnd}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={billingHistoryRef} className="scroll-mt-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Billing History</CardTitle>
              <CardDescription>View and download past invoices</CardDescription>
              </div>
              <Button variant="outline" onClick={() => router.push("/upgrade")}>
                Manage payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BillingHistory />
          </CardContent>
        </Card>
      </div>

      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        {...successData}
      />
    </div>
  );
}
