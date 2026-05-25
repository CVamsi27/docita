import type { CurrentPlanCardProps } from "@/features/subscription/components/cards/current-plan-card-types";

type StatusNotice = CurrentPlanCardProps["statusNotice"];

export function buildCurrentPlanStatusNotice(input: {
  isSubscriptionExpired: boolean;
  isInGracePeriod: boolean;
  isPaymentPastDue: boolean;
  isTrialing: boolean;
  isTrialExpired: boolean;
  planStripDaysLeft: number | null;
  subscriptionStatus: string | undefined;
  hasOutstandingPendingPayment: boolean;
  renewalPeriodLapsed: boolean;
  resolvePayment: () => void | Promise<void>;
  scrollToPlans: () => void;
}): StatusNotice {
  const {
    isSubscriptionExpired,
    isInGracePeriod,
    isPaymentPastDue,
    isTrialing,
    isTrialExpired,
    planStripDaysLeft,
    subscriptionStatus,
    hasOutstandingPendingPayment,
    renewalPeriodLapsed,
    resolvePayment,
    scrollToPlans,
  } = input;

  if (isSubscriptionExpired) {
    return {
      title: "Subscription Expired",
      badgeLabel: "Workspace Locked",
      description:
        "Your facility is locked because the subscription has expired. Choose a plan and complete payment to restore access.",
      actionLabel: "Choose a Plan",
      onAction: scrollToPlans,
      variant: "destructive",
    };
  }

  if (isInGracePeriod) {
    return {
      title: "Payment Grace Period",
      badgeLabel: "Access Restricted",
      description:
        "Your subscription is in grace period after a missed payment. Complete payment now to prevent the workspace from being locked.",
      actionLabel: "Resolve Payment",
      onAction: () => void resolvePayment(),
      variant: "warning",
    };
  }

  if (isPaymentPastDue) {
    return {
      title: "Payment Past Due",
      badgeLabel: "Action Required",
      description:
        "Your payment is overdue. Complete payment to keep Docita access active.",
      actionLabel: "Resolve Payment",
      onAction: () => void resolvePayment(),
      variant: "warning",
    };
  }

  if (isTrialing || isTrialExpired) {
    return {
      title: isTrialExpired ? "Trial Ended" : "Trial In Progress",
      badgeLabel: isTrialExpired ? "Starter" : "Trial Active",
      description: isTrialExpired
        ? "Your trial has ended and your facility is now on the Starter plan. Upgrade to continue paid features."
        : planStripDaysLeft !== null && planStripDaysLeft > 0
          ? "Upgrade anytime to keep paid features after the trial."
          : "Your trial ends today. Upgrade anytime to keep paid features active.",
      variant: isTrialExpired ? "warning" : "default",
    };
  }

  if (
    subscriptionStatus === "ACTIVE" &&
    hasOutstandingPendingPayment &&
    renewalPeriodLapsed
  ) {
    return {
      title: "Payment Pending",
      badgeLabel: "Action Required",
      description:
        "Your renewal payment is still outstanding. Complete payment to keep Docita access active.",
      actionLabel: "Pay now",
      onAction: () => void resolvePayment(),
      variant: "warning",
    };
  }

  if (subscriptionStatus === "ACTIVE") {
    return undefined;
  }

  return {
    title: "Starter plan",
    badgeLabel: "Starter",
    description:
      "Your clinic is on the Starter plan. Choose a paid plan when you need higher limits or advanced workflows.",
    variant: "default",
  };
}
