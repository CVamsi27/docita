interface BuildStatusNoticeParams {
  isSubscriptionExpired: boolean;
  isInGracePeriod: boolean;
  isPaymentPastDue: boolean;
  isTrialing: boolean;
  isTrialExpired: boolean;
  planStripDaysLeft: number | null;
  subscriptionStatus: string | undefined;
  hasOutstandingPendingPayment: boolean;
  renewalPeriodLapsed: boolean;
  resolvePayment: () => Promise<void>;
  scrollToPlans: () => void;
}

export function buildCurrentPlanStatusNotice(params: BuildStatusNoticeParams) {
  const {
    isSubscriptionExpired,
    isInGracePeriod,
    isPaymentPastDue,
    isTrialing,
    isTrialExpired,
    planStripDaysLeft,
    hasOutstandingPendingPayment,
    renewalPeriodLapsed,
    resolvePayment,
    scrollToPlans,
  } = params;

  if (isSubscriptionExpired) {
    return {
      title: "Your subscription has expired",
      description: "Some features may be limited. Renew to restore full access.",
      variant: "destructive" as const,
      actionLabel: "Renew now",
      onAction: resolvePayment,
    };
  }

  if (isPaymentPastDue && hasOutstandingPendingPayment && renewalPeriodLapsed) {
    return {
      title: "Payment overdue",
      description: "Your plan access will be restricted if not paid soon.",
      variant: "destructive" as const,
      badgeLabel: "Past due",
      actionLabel: "Pay now",
      onAction: resolvePayment,
    };
  }

  if (isInGracePeriod) {
    return {
      title: "Grace period active",
      description: `Your subscription ended ${planStripDaysLeft !== null ? `${planStripDaysLeft} day(s) ago` : "recently"}. Renew to keep full access.`,
      variant: "warning" as const,
      badgeLabel: "Grace period",
      actionLabel: "Renew",
      onAction: resolvePayment,
    };
  }

  if (isTrialing && !isTrialExpired) {
    const daysLeft = planStripDaysLeft;
    return {
      title: `Trial period — ${daysLeft !== null ? `${daysLeft} day(s) left` : "active"}`,
      description: "Choose a plan to continue using all features after the trial.",
      variant: "default" as const,
      badgeLabel: "Trial",
      actionLabel: "View plans",
      onAction: scrollToPlans,
    };
  }

  if (isPaymentPastDue) {
    return {
      title: "Payment past due",
      description: "Please update your payment method to continue uninterrupted service.",
      variant: "warning" as const,
      actionLabel: "Pay now",
      onAction: resolvePayment,
    };
  }

  return null;
}
