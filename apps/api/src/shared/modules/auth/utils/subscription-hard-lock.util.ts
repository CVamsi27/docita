import { SubscriptionStatus } from '@workspace/db';

export function isSubscriptionPastGraceDeadline(params: {
  subscriptionStatus: SubscriptionStatus;
  graceUntil: Date | null | undefined;
}): boolean {
  if (!params.graceUntil) {
    return false;
  }
  if (
    params.subscriptionStatus !== SubscriptionStatus.GRACE &&
    params.subscriptionStatus !== SubscriptionStatus.PAST_DUE
  ) {
    return false;
  }
  return Date.now() > new Date(params.graceUntil).getTime();
}

export function isBillingAdminRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'ADMIN_DOCTOR';
}
