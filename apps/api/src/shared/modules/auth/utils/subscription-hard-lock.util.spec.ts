import { SubscriptionStatus } from '@workspace/db';
import { describe, expect, it } from '@jest/globals';
import {
  isRenewalUnpaidWithOutstandingPending,
  isSubscriptionBillingHardLocked,
} from './subscription-hard-lock.util';

describe('subscription-hard-lock.util', () => {
  const pastPeriodEnd = new Date('2020-01-01T00:00:00.000Z');
  const futurePeriodEnd = new Date('2099-01-01T00:00:00.000Z');

  it('treats lapsed renewal with pending payment as hard-locked', () => {
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        subscriptionCurrentPeriodEnd: pastPeriodEnd,
        now: Date.now(),
      }),
    ).toBe(true);
  });

  it('does not hard-lock pending payment before period end', () => {
    expect(
      isRenewalUnpaidWithOutstandingPending({
        hasOutstandingPendingPayment: true,
        subscriptionCurrentPeriodEnd: futurePeriodEnd,
        now: Date.now(),
      }),
    ).toBe(false);
  });

  it('combines grace deadline and pending renewal unpaid', () => {
    expect(
      isSubscriptionBillingHardLocked({
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        graceUntil: null,
        hasOutstandingPendingPayment: true,
        subscriptionCurrentPeriodEnd: pastPeriodEnd,
        now: Date.now(),
      }),
    ).toBe(true);

    expect(
      isSubscriptionBillingHardLocked({
        subscriptionStatus: SubscriptionStatus.GRACE,
        graceUntil: new Date('2020-01-01T00:00:00.000Z'),
        hasOutstandingPendingPayment: false,
        subscriptionCurrentPeriodEnd: pastPeriodEnd,
        now: Date.now(),
      }),
    ).toBe(true);
  });
});
