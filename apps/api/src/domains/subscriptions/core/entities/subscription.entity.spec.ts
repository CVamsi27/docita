import { describe, expect, it } from '@jest/globals';
import { Subscription } from './subscription.entity';
import {
  BillingCycle,
  ClinicTier,
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects';

function buildSubscription(
  overrides: Partial<{
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    graceUntil: Date | null;
    razorpaySubscriptionId: string | undefined;
  }> = {},
): Subscription {
  return new Subscription({
    id: 'sub-1',
    clinicId: 'clinic-1',
    plan: ClinicTier.fromString('ESSENTIAL'),
    billingCycle: BillingCycle.fromString('MONTHLY'),
    basePriceCents: 99900,
    status:
      overrides.status ??
      new SubscriptionStatus(SubscriptionStatusEnum.PAST_DUE),
    currentPeriodStart:
      overrides.currentPeriodStart ?? new Date('2026-01-01T00:00:00.000Z'),
    currentPeriodEnd:
      overrides.currentPeriodEnd ?? new Date('2026-02-01T00:00:00.000Z'),
    graceUntil: overrides.graceUntil ?? new Date('2026-01-15T00:00:00.000Z'),
    razorpaySubscriptionId: overrides.razorpaySubscriptionId,
    autoPayEnabled: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    version: 1,
  });
}

describe('Subscription entity', () => {
  describe('calculatePeriodEnd', () => {
    it('advances one month for monthly billing', () => {
      const start = new Date('2026-03-15T10:00:00.000Z');
      const end = Subscription.calculatePeriodEnd(
        start,
        BillingCycle.fromString('MONTHLY'),
      );
      expect(end.getMonth()).toBe(start.getMonth() + 1);
    });

    it('advances one year for yearly billing', () => {
      const start = new Date('2026-03-15T10:00:00.000Z');
      const end = Subscription.calculatePeriodEnd(
        start,
        BillingCycle.fromString('YEARLY'),
      );
      expect(end.getFullYear()).toBe(start.getFullYear() + 1);
    });
  });

  describe('createFromRazorpayActivation', () => {
    it('creates an active subscription with Razorpay linkage', () => {
      const periodStart = new Date('2026-04-01T00:00:00.000Z');
      const periodEnd = new Date('2026-05-01T00:00:00.000Z');
      const now = new Date('2026-04-01T00:00:00.000Z');
      const subscription = Subscription.createFromRazorpayActivation({
        id: 'new-sub',
        clinicId: 'clinic-2',
        plan: ClinicTier.fromString('PROFESSIONAL'),
        billingCycle: BillingCycle.fromString('MONTHLY'),
        basePriceCents: 149900,
        periodStart,
        periodEnd,
        razorpaySubscriptionId: 'rzp_sub_123',
        now,
      });

      expect(subscription.getStatus().value).toBe(SubscriptionStatusEnum.ACTIVE);
      expect(subscription.currentPeriodStart).toEqual(periodStart);
      expect(subscription.currentPeriodEnd).toEqual(periodEnd);
      expect(subscription.razorpaySubscriptionId).toBe('rzp_sub_123');
      expect(subscription.isAutoPayEnabled()).toBe(true);
    });
  });

  describe('applyRazorpayActivation', () => {
    it('reactivates an existing subscription and syncs billing period', () => {
      const subscription = buildSubscription();
      const periodStart = new Date('2026-04-01T00:00:00.000Z');
      const periodEnd = new Date('2026-05-01T00:00:00.000Z');

      subscription.applyRazorpayActivation(
        periodStart,
        periodEnd,
        'rzp_sub_existing',
        periodStart,
      );

      expect(subscription.getStatus().value).toBe(SubscriptionStatusEnum.ACTIVE);
      expect(subscription.getGraceUntil()).toBeNull();
      expect(subscription.currentPeriodStart).toEqual(periodStart);
      expect(subscription.currentPeriodEnd).toEqual(periodEnd);
      expect(subscription.razorpaySubscriptionId).toBe('rzp_sub_existing');
    });
  });

  describe('shouldPreservePeriodEndOnTierChange', () => {
    it('preserves period end on same-cycle tier upgrade', () => {
      const subscription = buildSubscription({
        status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
      });
      expect(
        subscription.shouldPreservePeriodEndOnTierChange(
          ClinicTier.fromString('PROFESSIONAL'),
          BillingCycle.fromString('MONTHLY'),
        ),
      ).toBe(true);
    });

    it('does not preserve when billing cycle changes', () => {
      const subscription = buildSubscription({
        status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
      });
      expect(
        subscription.shouldPreservePeriodEndOnTierChange(
          ClinicTier.fromString('PROFESSIONAL'),
          BillingCycle.fromString('YEARLY'),
        ),
      ).toBe(false);
    });
  });

  describe('applyRazorpayRenewal', () => {
    it('keeps subscription active and extends the period end', () => {
      const subscription = buildSubscription({
        status: new SubscriptionStatus(SubscriptionStatusEnum.GRACE),
      });
      const newPeriodEnd = new Date('2026-06-01T00:00:00.000Z');

      subscription.applyRazorpayRenewal(newPeriodEnd, newPeriodEnd);

      expect(subscription.getStatus().value).toBe(SubscriptionStatusEnum.ACTIVE);
      expect(subscription.getGraceUntil()).toBeNull();
      expect(subscription.currentPeriodEnd).toEqual(newPeriodEnd);
    });
  });
});
