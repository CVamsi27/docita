import type { SubscriptionNoticeContext } from "./subscription-lock-notice-context";
import type { SubscriptionLockNoticeCopy } from "./subscription-lock-notice-types";

export function renewalPaymentNotice(): SubscriptionLockNoticeCopy {
  return {
    kind: "payment-required",
    title: "Renewal payment pending",
    description:
      "Your billing period has ended and the subscription charge is still unpaid. Complete payment under Settings, Subscription to keep staff access active.",
    ctaLabel: "Pay now",
    variant: "destructive",
  };
}

export function expiredNotice(): SubscriptionLockNoticeCopy {
  return {
    kind: "expired",
    title: "Subscription Expired: Workspace Locked",
    description:
      "This facility is locked until payment is completed. You can still open billing under Settings, Subscription to restore access.",
    ctaLabel: "Resolve Payment",
    variant: "destructive",
  };
}

export function trialGraceNotice(
  context: SubscriptionNoticeContext,
): SubscriptionLockNoticeCopy {
  return {
    kind: "trial-grace",
    title: "Trial ended — payment required",
    description: `Your free trial has ended${formatGraceDays(
      context.trialGraceDaysLeft,
    )} before access is blocked. Open Settings → Subscription to pay now.`,
    ctaLabel: "Pay now",
    variant: "destructive",
  };
}

export function pausedNotice(): SubscriptionLockNoticeCopy {
  return {
    kind: "paused",
    title: "Subscription Paused",
    description:
      "This subscription is paused. Resolve billing to restore full access.",
    ctaLabel: "Resolve Payment",
    variant: "default",
    toneClass: "border-warning/40 bg-warning/10",
  };
}

export function graceOrPastDueNotice(
  isPastDue: boolean,
  context: SubscriptionNoticeContext,
): SubscriptionLockNoticeCopy {
  return {
    kind: "grace-or-past-due",
    title: "Payment Grace Period: Access Restricted",
    description: `${isPastDue ? "Your payment is overdue." : "Payment is still unresolved."}${formatGraceTail(
      context,
    )}`,
    ctaLabel: "Resolve Payment",
    variant: "default",
    toneClass: "border-warning/40 bg-warning/10",
  };
}

export function trialActiveNotice(
  context: SubscriptionNoticeContext,
): SubscriptionLockNoticeCopy {
  const isEnding = context.trialDaysLeft !== null && context.trialDaysLeft <= 3;
  return {
    kind: "trial-active",
    title: isEnding
      ? "Trial ending soon"
      : "Trial active: payment not completed",
    description: `${context.trialTierLabel} plan · ${formatTrialBody(
      context.trialDaysLeft,
    )}${context.trialEndText ? ` (ends ${context.trialEndText})` : ""}. Add payment before it ends to stay active.`,
    ctaLabel: "Billing & subscription",
    variant: "default",
    toneClass: "border-info/40 bg-info/10",
    trialDaysLeft: context.trialDaysLeft,
  };
}

export function paymentRequiredNotice(): SubscriptionLockNoticeCopy {
  return {
    kind: "payment-required",
    title: "Payment required",
    description:
      "Your subscription needs billing attention. Resolve payment to keep Docita access active.",
    ctaLabel: "Resolve Payment",
    variant: "default",
    toneClass: "border-warning/40 bg-warning/10",
  };
}

function formatGraceDays(daysLeft: number | null): string {
  return daysLeft !== null
    ? `. You have ${daysLeft} day${daysLeft === 1 ? "" : "s"} to complete payment`
    : "";
}

function formatGraceTail(context: SubscriptionNoticeContext): string {
  return context.graceUntilText && !context.pastGraceDeadline
    ? ` Resolve by ${context.graceUntilText} or staff access may pause until a billing admin completes payment under Settings, Subscription.`
    : " Resolve payment now to keep Docita access active.";
}

function formatTrialBody(daysLeft: number | null): string {
  return daysLeft !== null
    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial`
    : "trial active";
}
