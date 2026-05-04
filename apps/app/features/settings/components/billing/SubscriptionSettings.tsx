"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ReactNode } from "react";
import type { SubscriptionCurrentResponse } from "@workspace/types";
import { useAuth } from "@/lib/auth-context";
import { useBillingHistory } from "@/hooks/api/use-billing-history";
import { getTierInfo } from "@/lib/tier-config";
import { useSubscription } from "@/hooks/api/use-settings";
import { WhatsAppButton } from "@/features/_shared/components/whatsapp/whatsapp-button";
import { getSupportPhoneNumber } from "@/lib/support-contact";
import { BillingSubscriptionWorkspace } from "@/features/subscription/components/billing-subscription-workspace";
import { TrialOfferBanner } from "@/features/subscription/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Section } from "@workspace/ui/components/section";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { AlertTriangle, Clock, Info, XCircle } from "lucide-react";
import { BillingHistoryTable } from "@/features/subscription/components/billing/BillingHistoryTable";
import { getDisplayBillingPeriodEndAndDaysLeft } from "@/features/subscription/lib/billing-period-display";
import { useClinic } from "@/lib/clinic-context";
import {
  parseWorkspaceProfile,
  WORKSPACE_PROFILE_LABEL,
} from "@workspace/types";

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
    return `${base}. Starter at no charge does not create subscription checkout rows, so this list stays empty until you upgrade and pay.`;
  }

  if (subscription.subscriptionStatus === "TRIALING") {
    return `${base}. Add a payment method before the trial ends so renewals can generate invoices here.`;
  }

  return base;
}

function billingHistoryEmptyDescription(
  subscription: SubscriptionCurrentResponse | null | undefined,
): string | undefined {
  if (!subscription) {
    return undefined;
  }

  if (isFreeStarterActive(subscription)) {
    return "There is no subscription invoice for Starter at no charge. After you upgrade and complete Razorpay checkout, paid receipts will appear here.";
  }

  if (subscription.subscriptionStatus === "TRIALING") {
    return "Invoices appear after you add a payment method and your first paid charge completes.";
  }

  return undefined;
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
  const { data: subscription, isLoading } = useSubscription();
  const billingHistoryRef = useRef<HTMLDivElement>(null);

  const supportPhone = getSupportPhoneNumber();

  if (isLoading) {
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
  const subscriptionStatus = subscription?.subscriptionStatus || "Inactive";
  const workspaceProfileLabel = WORKSPACE_PROFILE_LABEL[
    parseWorkspaceProfile(clinic?.workspaceProfile)
  ];

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
          <p className="mt-2 text-sm text-muted-foreground">
            Workspace mode: {workspaceProfileLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Workspace is not a separate paid tier; it controls which product areas
            are enabled for your facility.
          </p>
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
    subscriptionStatus === "ACTIVE" && subscription
      ? (getDisplayBillingPeriodEndAndDaysLeft(subscription)?.daysLeft ?? null)
      : null;

  const isPaymentDue =
    subscriptionStatus === "PAYMENT_DUE" || subscriptionStatus === "PAST_DUE";
  const isExpired = subscriptionStatus === "EXPIRED";
  const isInGracePeriod = subscriptionStatus === "GRACE";
  const freeStarterActive = isFreeStarterActive(subscription ?? undefined);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-[var(--fs-md)]">Plan and workspace</CardTitle>
          <CardDescription>
            Your paid plan name (Starter, Essential, and so on) is the
            subscription tier. Front desk is a workspace mode, not another tier:
            it limits clinical apps while keeping appointments and billing. Tier
            and workspace are both shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-muted-foreground">Subscription tier</p>
            <p className="font-medium text-foreground">{tierName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Workspace</p>
            <p className="font-medium text-foreground">{workspaceProfileLabel}</p>
          </div>
        </CardContent>
      </Card>

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
            <span>
              Your clinic is active on Starter at no charge, so there is no
              Razorpay subscription receipt yet. Billing history only lists
              completed subscription checkouts (and any one-off charges we record
              for your clinic). Upgrade when you are ready for paid limits and
              invoices here.
            </span>
            <Button
              size="sm"
              onClick={scrollToBillingPlans}
              className="shrink-0"
            >
              View paid plans
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

      <Section
        id="billing-subscription-section"
        title="Billing & Subscription"
        description="Change plan, compare features, and view invoices"
        contentClassName="space-y-6"
      >
        <BillingSubscriptionWorkspace />

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          <p className="text-[var(--fs-2xs)] text-muted-foreground">
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

      <div ref={billingHistoryRef} className="scroll-mt-6">
        <Section
          id="billing-history-section"
          title="Billing History"
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
