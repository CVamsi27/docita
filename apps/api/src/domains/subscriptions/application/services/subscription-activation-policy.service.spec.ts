import { describe, expect, it } from '@jest/globals';
import { SubscriptionActivationPolicyService } from './subscription-activation-policy.service';
import {
  BillingCycle,
  ClinicTier,
} from '@/domains/subscriptions/core/value-objects';
import { Subscription } from '@/domains/subscriptions/core/entities/subscription.entity';
import {
  SubscriptionStatus,
  SubscriptionStatusEnum,
} from '@/domains/subscriptions/core/value-objects/subscription-status.value-object';

describe('SubscriptionActivationPolicyService', () => {
  const policy = new SubscriptionActivationPolicyService();

  it('returns paid-tier feature flags for non-starter plans', () => {
    const tier = ClinicTier.fromString('ESSENTIAL');
    expect(policy.buildPaidTierFeatureUpdates(tier)).toEqual({
      WHATSAPP: true,
      PAYMENT_LINKS: true,
      WHATSAPP_REMINDERS: true,
    });
  });

  it('preserves period end on same-cycle tier upgrade', () => {
    const subscription = new Subscription({
      id: 'sub-1',
      clinicId: 'clinic-1',
      plan: ClinicTier.fromString('ESSENTIAL'),
      billingCycle: BillingCycle.fromString('MONTHLY'),
      basePriceCents: 99900,
      status: new SubscriptionStatus(SubscriptionStatusEnum.ACTIVE),
      currentPeriodStart: new Date('2026-01-01'),
      currentPeriodEnd: new Date('2026-02-01'),
      autoPayEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    });

    expect(
      policy.shouldPreserveCurrentPeriodEnd(
        subscription,
        ClinicTier.fromString('PROFESSIONAL'),
        BillingCycle.fromString('MONTHLY'),
      ),
    ).toBe(true);
  });

  it('advances monthly period end from start date', () => {
    const start = new Date('2026-03-15T10:00:00.000Z');
    const end = policy.calculatePeriodEnd(
      start,
      BillingCycle.fromString('MONTHLY'),
    );
    expect(end.getMonth()).toBe(start.getMonth() + 1);
  });
});
