import type { ReactNode } from "react";
import type { AppClinic, SubscriptionCurrentResponse } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";
import { getTierInfo } from "@/lib/subscription/tier-access";
import { getTrialState } from "@/lib/subscription/subscription-lockout";
import { getClinicGstin } from "@workspace/utils";

export interface SubscriptionSettingsState {
  tierName: string;
  subscriptionStatusLabel: string;
  trialDaysLeft: number | null;
  freeStarterActive: boolean;
  isPaymentDue: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  showRecoveryCard: boolean;
  needsGstinForInvoices: boolean;
}

export function deriveSubscriptionSettingsState({
  clinic,
  subscription,
}: {
  clinic: AppClinic | null | undefined;
  subscription: SubscriptionCurrentResponse | null | undefined;
}): SubscriptionSettingsState {
  const subscriptionStatus = subscription?.subscriptionStatus;
  const subscriptionStatusLabel = subscriptionStatus || "Inactive";
  const tierName = subscription?.tier
    ? getTierInfo(subscription.tier).name
    : "Starter";
  const isPaymentDue =
    subscriptionStatus === "PAYMENT_DUE" || subscriptionStatus === "PAST_DUE";
  const isExpired = subscriptionStatus === "EXPIRED";
  const isInGracePeriod = subscriptionStatus === "GRACE";
  const trialState = subscription?.trialWindowState ?? getTrialState(clinic);
  const renewalPeriodLapsed =
    subscription?.currentPeriodEnd != null
      ? new Date(subscription.currentPeriodEnd).getTime() <= Date.now()
      : false;
  const hasOutstandingPendingPayment =
    subscription?.hasOutstandingPendingPayment === true;
  const freeStarterActive = isFreeStarterActive(subscription);

  return {
    tierName,
    subscriptionStatusLabel,
    trialDaysLeft:
      subscriptionStatusLabel === "TRIALING"
        ? (subscription?.daysRemaining ?? null)
        : null,
    freeStarterActive,
    isPaymentDue,
    isExpired,
    isInGracePeriod,
    showRecoveryCard:
      isPaymentDue ||
      isInGracePeriod ||
      trialState === "GRACE" ||
      (hasOutstandingPendingPayment && renewalPeriodLapsed),
    needsGstinForInvoices:
      !getClinicGstin(clinic?.settings) &&
      (subscription?.basePriceCents ?? 0) > 0 &&
      subscription?.currency?.toUpperCase() === "INR",
  };
}

export function scrollToBillingPlans() {
  document.getElementById("billing-plans-section")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function isFreeStarterActive(
  subscription: SubscriptionCurrentResponse | null | undefined,
): boolean {
  if (!subscription) return false;
  return (
    subscription.subscriptionStatus === "ACTIVE" &&
    subscription.tier === "STARTER" &&
    (subscription.basePriceCents ?? 0) === 0
  );
}

export function billingHistorySectionActions(
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

  if (status === "PAST_DUE" || status === "PAYMENT_DUE" || status === "GRACE") return null;

  if (
    status === "ACTIVE" &&
    subscription.hasOutstandingPendingPayment === true &&
    subscription.currentPeriodEnd != null &&
    new Date(subscription.currentPeriodEnd).getTime() <= Date.now()
  ) {
    return null;
  }

  if (status === "TRIALING") {
    return (
      <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
        Add payment
      </Button>
    );
  }

  if (status === "ACTIVE") return null;

  return (
    <Button variant="outline" size="sm" onClick={scrollToBillingPlans}>
      View plans
    </Button>
  );
}

export function billingHistorySectionDescription(
  _subscription: SubscriptionCurrentResponse | null | undefined,
): string {
  return "View and download past invoices";
}

export function billingHistoryEmptyDescription(
  subscription: SubscriptionCurrentResponse | null | undefined,
): string | undefined {
  if (!subscription) return "Invoices appear after your first completed payment.";
  if (isFreeStarterActive(subscription)) {
    return "Invoices appear after you upgrade and complete payment.";
  }
  if (subscription.subscriptionStatus === "TRIALING") return "Invoices appear after the first paid cycle.";
  return "Invoices appear after completed payments.";
}
