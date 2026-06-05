export const billingStatusBadgeClasses: Record<string, string> = {
  ACTIVE: "badge-success",
  TRIAL: "badge-info",
  PAST_DUE: "badge-warning",
  GRACE_PERIOD: "badge-warning",
  CANCELLED: "badge-danger",
  EXPIRED: "badge-muted",
  SCHEDULED_DOWNGRADE: "tier-pro",
};

export function getBillingStatusBadgeClass(status: string) {
  return billingStatusBadgeClasses[status] ?? billingStatusBadgeClasses.ACTIVE;
}

export function formatBillingStatus(status: string) {
  return status.replace(/_/g, " ");
}
