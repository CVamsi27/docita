import type { ReactNode } from "react";
import type { SubscriptionCurrentResponse } from "@workspace/types";
import { Button } from "@workspace/ui/components/form/button";

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

export function billingHistorySectionDescription(
  _subscription: SubscriptionCurrentResponse | null | undefined,
): string {
  return "View and download past invoices";
}

export function billingHistoryEmptyDescription(
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
