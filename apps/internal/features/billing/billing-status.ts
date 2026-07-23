export const billingStatusBadgeClasses: Record<string, string> = {
  ACTIVE: "badge-success",
  TRIAL: "badge-info",
  PAST_DUE: "badge-warning",
  GRACE_PERIOD: "badge-warning",
  CANCELLED: "badge-muted",
  EXPIRED: "badge-danger",
  SCHEDULED_DOWNGRADE: "tier-pro",
};

export function getBillingStatusBadgeClass(status: string) {
  return billingStatusBadgeClasses[status] ?? billingStatusBadgeClasses.ACTIVE;
}

/**
 * Format a billing status enum into a human-readable label.
 * When a translation function is provided, status labels are resolved
 * through i18n. Otherwise falls back to replacing underscores with spaces.
 */
export function formatBillingStatus(
  status: string,
  t?: (key: string) => string,
) {
  if (t) {
    const statusMap: Record<string, string> = {
      ACTIVE: t('statusActive'),
      TRIAL: t('statusTrial'),
      PAST_DUE: t('statusPastDue'),
      GRACE_PERIOD: t('statusGracePeriod'),
      CANCELLED: t('statusCancelled'),
      EXPIRED: t('statusExpired'),
    };
    return statusMap[status] ?? status;
  }
  return status.replace(/_/g, " ");
}
