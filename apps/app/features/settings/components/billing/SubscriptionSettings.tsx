"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import type { SubscriptionCurrentResponse } from "@workspace/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useBillingHistory } from "@/hooks/api/use-billing-history";
import { getTierInfo } from "@/lib/tier-config";
import { useSubscription } from "@/hooks/api/use-settings";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import { getSupportPhoneNumber } from "@/lib/support-contact";
import {
  BillingHistoryTable,
  BillingSubscriptionWorkspace,
  PaymentRecoveryCard,
} from "@/features/subscription";
import { getTrialState } from "@/lib/subscription/subscription-lockout";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Section } from "@workspace/ui/components/layout/section";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { AlertTriangle, Clock, Info, XCircle } from "lucide-react";
import { useClinic } from "@/lib/contexts/clinic-context";

function scrollToBillingPlans() {
  document.getElementById("billing-plans-section")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function isFreeStarterActive(
  subscription: SubscriptionCurrentResponse | null | undefined,
): boolean {
  if (!subscription) return false;
  return (
    subscription.subscriptionStatus === "ACTIVE" &&
    subscription.tier === "STARTER" &&
    (subscription.basePriceCents ?? 0) === 0
  );
}

function billingHistorySectionActions(
  subscription: SubscriptionCurrentResponse | null | undefined,
): ReactNode {
  if (!subscription) {
    return (
      <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
        View plans
      </Button>
    );
  }

  const { subscriptionStatus: status } = subscription;

  if (status === "ACTIVE" && isFreeStarterActive(subscription)) {
    return (
      <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
        View paid plans
      </Button>
    );
  }

  if (status === "EXPIRED") {
    return (
      <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
        Choose plan and pay
      </Button>
    );
  }

  if (status === "PAST_DUE" || status === "PAYMENT_DUE" || status === "GRACE") {
    return (
      <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
        {status === "GRACE" ? "Resolve payment" : "Update payment"}
      </Button>
    );
  }

  if (status === "TRIALING") {
    return (
      <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
        Add payment
      </Button>
    );
  }

  if (status === "ACTIVE") {
    return null;
  }

  return (
    <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
      View plans
    </Button>
  );
}

function billingHistorySectionDescription(
  subscription: SubscriptionCurrentResponse | null | undefined,
): string {
  const base = "View and download past invoices";
  if (!subscription) {
    return base;
  }

  if (isFreeStarterActive(subscription)) {
    return base;
  }

  if (subscription.subscriptionStatus === "TRIALING") {
    return base;
  }

  return base;
}

function billingHistoryEmptyDescription(
  subscription: SubscriptionCurrentResponse | null | undefined,
): string | undefined {
  if (!subscription) {
    return "Invoices appear after your first completed payment.";
  }

  if (isFreeStarterActive(subscription)) {
    return "Invoices appear after you upgrade and complete payment.";
  }

  if (subscription.subscriptionStatus === "TRIALING") {
    return "Invoices appear after the first paid cycle.";
  }

  return "Invoices appear after completed payments.";
}

function BillingHistory({
  emptyStateDescription,
}: {
  emptyStateDescription?: string;
}) {
  const { data: invoices, isLoading } = useBillingHistory();
  return (
    <BillingHistoryTable
      invoices={invoices}
      isLoading={isLoading}
      emptyStateDescription={emptyStateDescription}
    />
  );
}

export function SubscriptionSettings() {
  const { isAdmin } = useAuth();
  const { clinic } = useClinic();
  const billing = useBillingSubscriptionWorkspace();

  useAutoResolveSubscriptionPayment({
    enabled: isAdmin,
    subscription: billing.subscription,
    isLoading: billing.isSubscriptionLoading,
    isBillingHistoryLoading: billing.isBillingHistoryLoading,
    resolvePayment: billing.resolvePayment,
    clinic,
  });

  const supportPhone = getSupportPhoneNumber();
  const subscription = billing.subscription;
  const subscriptionStatus = subscription?.subscriptionStatus;
  const hasOutstandingPendingPayment =
    subscription?.hasOutstandingPendingPayment === true;
  const renewalPeriodLapsed =
    subscription?.currentPeriodEnd != null
      ? new Date(subscription.currentPeriodEnd).getTime() <= Date.now()
      : false;
  const isPaymentDue =
    subscriptionStatus === "PAYMENT_DUE" || subscriptionStatus === "PAST_DUE";
  const isExpired = subscriptionStatus === "EXPIRED";
  const isInGracePeriod = subscriptionStatus === "GRACE";
  const trialState = getTrialState(clinic);
  const showRecoveryCard =
    isPaymentDue ||
    isInGracePeriod ||
    trialState === "GRACE" ||
    (hasOutstandingPendingPayment && renewalPeriodLapsed);

  if (billing.isSubscriptionLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div
            className="flex flex-col items-center gap-4 sm:flex-row sm:items-start"
            role="status"
            aria-live="polite"
            aria-label="Loading subscription"
          >
            <DocitaLoadingIndicator
              variant="section"
              withStatusRole={false}
              iconClassName="h-8 w-8 text-muted-foreground"
            />
            <div className="min-w-0 flex-1 space-y-2 text-left">
              <Skeleton className="h-4 w-full max-w-[250px]" />
              <Skeleton className="h-4 w-full max-w-[200px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tierName = subscription?.tier
    ? getTierInfo(subscription.tier).name
    : "Starter";
  const subscriptionStatusLabel = subscriptionStatus || "Inactive";
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
              {subscriptionStatusLabel}
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
    subscriptionStatusLabel === "TRIALING" && subscription?.currentPeriodEnd
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : null;

  const freeStarterActive = isFreeStarterActive(subscription ?? undefined);
  const isResolving = billing.isCheckoutProcessing;

  return (
    <div className="space-y-6">
      <PaymentRecoveryCard
        show={showRecoveryCard}
        recoverablePayment={billing.recoverablePayment}
        resolvePayment={billing.resolvePayment}
        isResolving={isResolving}
      />
      {trialDaysLeft !== null ? (
        <Alert className="border-info/40 bg-info/10">
          <Clock className="h-4 w-4 text-info" />
          <AlertTitle>Free Trial Active</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your ${tierName} trial.`
                : `Your ${tierName} trial ends today`}{" "}
              Add payment before the trial ends so your subscription can renew
              without interruption.
            </span>
            <Button
              size="sm"
              onClick={scrollToBillingPlans}
              className="shrink-0"
            >
              Add payment
            </Button>
          </AlertDescription>
        </Alert>
      ) : freeStarterActive ? (
        <Alert className="border-border bg-muted/40">
          <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
          <AlertTitle>Starter without a paid subscription</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Your clinic is active on Starter at no charge.</span>
            <Button
              size="sm"
              onClick={scrollToBillingPlans}
              className="shrink-0"
            >
              View paid plans
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isPaymentDue && !showRecoveryCard && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Payment due</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Your payment is overdue. Update your payment method to avoid
              service interruption.
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isResolving}
              onClick={() => void billing.resolvePayment()}
              className="shrink-0 border-destructive-foreground/30 text-destructive-foreground hover:bg-destructive-foreground/10"
            >
              {isResolving ? "Opening…" : "Update payment"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isInGracePeriod && !showRecoveryCard && (
        <Alert className="border-warning/40 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>Payment grace period</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Payment is still unresolved. Some access may be restricted until
              payment is completed.
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={isResolving}
              onClick={() => void billing.resolvePayment()}
              className="shrink-0"
            >
              {isResolving ? "Opening…" : "Resolve payment"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Subscription expired</AlertTitle>
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
              Choose a plan
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Section
        id="billing-subscription-section"
        title="Billing & subscription"
        description="Change plan, compare features, and view invoices"
        contentClassName="space-y-6"
      >
        <BillingSubscriptionWorkspaceView workspace={billing} />

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[var(--fs-sm)] text-muted-foreground">
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
      </Section>

      <div className="scroll-mt-6">
        <Section
          id="billing-history-section"
          title="Billing history"
          description={billingHistorySectionDescription(subscription ?? undefined)}
          actions={billingHistorySectionActions(subscription ?? undefined)}
        >
          <BillingHistory
            emptyStateDescription={billingHistoryEmptyDescription(
              subscription ?? undefined,
            )}
          />
        </Section>
      </div>
    </div>
  );
}
