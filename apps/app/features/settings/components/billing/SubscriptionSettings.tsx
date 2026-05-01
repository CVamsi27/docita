"use client";

import Link from "next/link";
import { useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBillingHistory } from "@/hooks/api/use-billing-history";
import { getTierInfo } from "@/lib/tier-config";
import { useSubscription } from "@/hooks/api/use-settings";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import { getSupportPhoneNumber } from "@/lib/support-contact";
import { BillingSubscriptionWorkspace } from "@/features/subscription/components/billing-subscription-workspace";
import { TrialOfferBanner } from "@/features/subscription/components";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { AlertTriangle, Clock, XCircle } from "lucide-react";
import { DEFAULT_CURRENCY } from "@workspace/utils";
import { BillingHistoryTable } from "@/features/subscription/components/billing/BillingHistoryTable";

function scrollToBillingPlans() {
  document.getElementById("billing-plans-section")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function BillingHistory() {
  const { data: invoices, isLoading } = useBillingHistory();
  return <BillingHistoryTable invoices={invoices} isLoading={isLoading} />;
}

export function SubscriptionSettings() {
  const { isAdmin } = useAuth();
  const { data: subscription, isLoading } = useSubscription();
  const billingHistoryRef = useRef<HTMLDivElement>(null);

  const supportPhone = getSupportPhoneNumber();

  if (isLoading) {
    return (
      <Card>
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

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="ui-section-title text-[var(--fs-lg)]">{tierName}</p>
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

  const paidPeriodDaysLeft =
    subscriptionStatus === "ACTIVE" && subscription?.currentPeriodEnd
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
  const isInGracePeriod = subscriptionStatus === "GRACE";

  const subscriptionCurrency = subscription?.currency || DEFAULT_CURRENCY;
  const billingCycle = subscription?.billingCycle || "monthly";
  const basePrice = (subscription?.basePriceCents ?? 0) / 100;
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
    : "-";
  const periodDaysLeft = subscription?.currentPeriodEnd
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <div className="space-y-6">
      {trialDaysLeft !== null ? (
        <Alert className="border-info/40 bg-info/10">
          <Clock className="h-4 w-4 text-info" />
          <AlertTitle>Free Trial Active</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your ${tierName} trial.`
                : `Your ${tierName} trial ends today`}{" "}
              {subscription?.tier === "STARTER"
                ? "Upgrade when you need higher limits or paid features."
                : "Add payment details to keep your paid features."}
            </span>
            <Button
              size="sm"
              onClick={scrollToBillingPlans}
              className="shrink-0"
            >
              {subscription?.tier === "STARTER"
                ? "View plans"
                : "Add Payment"}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <TrialOfferBanner
          actionLabel="View plans"
          onAction={scrollToBillingPlans}
        />
      )}

      {paidPeriodDaysLeft !== null && paidPeriodDaysLeft <= 7 && (
        <Alert className="border-warning/40 bg-warning/10">
          <Clock className="h-4 w-4 text-warning" />
          <AlertTitle>Subscription renewal coming up</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {paidPeriodDaysLeft > 0
                ? `${paidPeriodDaysLeft} day${paidPeriodDaysLeft !== 1 ? "s" : ""} left in the current billing period.`
                : "Your billing period ends today."}{" "}
              Ensure payment is completed to avoid interruption.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={scrollToBillingPlans}
              className="shrink-0"
            >
              Manage billing
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
              onClick={scrollToBillingPlans}
              className="shrink-0 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
            >
              Update Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isInGracePeriod && (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>Payment Grace Period</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Payment is still unresolved. Some access may be restricted until
              payment is completed.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={scrollToBillingPlans}
              className="shrink-0"
            >
              Resolve Payment
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Subscription Expired</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your facility workspace is locked. Choose a plan and complete
              payment to restore access.
            </span>
            <Button
              size="sm"
              onClick={scrollToBillingPlans}
              className="shrink-0 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
            >
              Choose a Plan
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="ui-section-title text-[var(--fs-xl)]">
            Billing &amp; Subscription
          </CardTitle>
          <CardDescription>
            Plans, comparison, checkout, and billing summary
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">
                {tierName} · {billingCycle} billing
              </p>
              <p className="text-xs text-muted-foreground">
                Current period ends {periodEnd}
                {periodDaysLeft !== null
                  ? ` (${periodDaysLeft} day${periodDaysLeft === 1 ? "" : "s"} left)`
                  : ""}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={scrollToBillingPlans}
            >
              View plans
            </Button>
          </div>

          <div className="rounded-lg border bg-background/60 p-4 md:p-5">
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
              {periodDaysLeft !== null && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Days remaining
                  </p>
                  <p className="font-medium">
                    {periodDaysLeft} day{periodDaysLeft === 1 ? "" : "s"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <BillingSubscriptionWorkspace />

          <div className="flex flex-col gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              General product help (email and WhatsApp) is under{" "}
              <Link
                href="/settings?tab=help-support"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Help & support
              </Link>
              .
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Need help with billing or onboarding?
              </p>
              <WhatsAppButton
                phoneNumber={supportPhone}
                message="Hi Docita team, I need help with billing and onboarding"
                label="Message support"
                variant="outline"
                size="sm"
                className="shrink-0"
              />
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
                <CardDescription>
                  View and download past invoices
                </CardDescription>
              </div>
              <Button variant="outline" onClick={scrollToBillingPlans}>
                Manage payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BillingHistory />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
