// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external SDK types
import { SubscriptionStatus } from '@workspace/db';
import { BILLING_ROLES } from '@workspace/types';

export function isSubscriptionPastGraceDeadline(params: {
  subscriptionStatus: SubscriptionStatus;
  graceUntil: Date | null | undefined;
  now?: number;
}): boolean {
  if (!params.graceUntil) return false;
  if (
    params.subscriptionStatus !== SubscriptionStatus.GRACE &&
    params.subscriptionStatus !== SubscriptionStatus.PAST_DUE
  )
    return false;
  const now = params.now ?? Date.now();
  return now > new Date(params.graceUntil).getTime();
}

export function isSubscriptionPeriodLapsed(
  currentPeriodEnd: Date | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!currentPeriodEnd) return false;
  const endMs = new Date(currentPeriodEnd).getTime();
  return Number.isFinite(endMs) && now >= endMs;
}

/**
 * Renewal window ended but a subscription payment row is still pending/failed.
 * Pending "Pay now" rows must not be treated as paid access.
 */
export function isRenewalUnpaidWithOutstandingPending(params: {
  hasOutstandingPendingPayment: boolean;
  subscriptionCurrentPeriodEnd: Date | null | undefined;
  now?: number;
}): boolean {
  if (!params.hasOutstandingPendingPayment) return false;
  return isSubscriptionPeriodLapsed(
    params.subscriptionCurrentPeriodEnd,
    params.now,
  );
}

export function isSubscriptionBillingHardLocked(params: {
  subscriptionStatus: SubscriptionStatus;
  graceUntil: Date | null | undefined;
  hasOutstandingPendingPayment: boolean;
  subscriptionCurrentPeriodEnd: Date | null | undefined;
  now?: number;
}): boolean {
  const now = params.now ?? Date.now();
  if (
    isSubscriptionPastGraceDeadline({
      subscriptionStatus: params.subscriptionStatus,
      graceUntil: params.graceUntil,
      now,
    })
  ) {
    return true;
  }
  return isRenewalUnpaidWithOutstandingPending({
    hasOutstandingPendingPayment: params.hasOutstandingPendingPayment,
    subscriptionCurrentPeriodEnd: params.subscriptionCurrentPeriodEnd,
    now,
  });
}

export function isBillingAdminRole(role: string | undefined): boolean {
  return typeof role === 'string' ? BILLING_ROLES.has(role as never) : false;
}
