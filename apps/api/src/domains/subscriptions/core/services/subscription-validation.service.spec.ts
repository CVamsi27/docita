import { describe, expect, it } from '@jest/globals';
import { SubscriptionValidationService } from './subscription-validation.service';
import type { Subscription } from '@/domains/subscriptions/core/entities';

const service = new SubscriptionValidationService();
const NOW = new Date('2026-07-04T00:00:00.000Z');

interface SubStub {
  daysRemaining?: number;
  due?: boolean;
  active?: boolean;
  terminal?: boolean;
  statusStr?: string;
  autoPay?: boolean;
  midCycle?: boolean;
  canRenew?: boolean;
  credits?: number;
  plan?: string | null;
}

function makeSub(o: SubStub = {}): Subscription {
  return {
    getDaysRemaining: () => o.daysRemaining ?? 10,
    isDueForRenewal: () => o.due ?? false,
    getStatus: () => ({
      isActive: () => o.active ?? true,
      isTerminal: () => o.terminal ?? false,
      toString: () => o.statusStr ?? 'ACTIVE',
    }),
    isAutoPayEnabled: () => o.autoPay ?? true,
    canBeMidCycleChanged: () => o.midCycle ?? true,
    canRenew: () => o.canRenew ?? true,
    getCredits: () => ({ paise: o.credits ?? 0 }),
    getPlan: () => ('plan' in o ? o.plan : 'ESSENTIAL'),
  } as unknown as Subscription;
}

describe('SubscriptionValidationService.validateSubscription', () => {
  it('passes an active, auto-pay, in-period subscription', () => {
    expect(service.validateSubscription(makeSub(), NOW)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('flags an expired subscription that is due for renewal', () => {
    const result = service.validateSubscription(
      makeSub({ daysRemaining: -3, due: true }),
      NOW,
    );
    expect(result.errors).toContain(
      'Subscription has expired and needs renewal',
    );
  });

  it('flags an active subscription without auto-pay', () => {
    const result = service.validateSubscription(
      makeSub({ autoPay: false }),
      NOW,
    );
    expect(result.errors).toContain(
      'Active subscription should have auto-pay enabled',
    );
  });
});

describe('SubscriptionValidationService.canChangePlan / cancel / billing cycle', () => {
  it('blocks a plan change on a non-mid-cycle-changeable subscription', () => {
    const result = service.canChangePlan(
      makeSub({ midCycle: false, statusStr: 'PAST_DUE' }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('PAST_DUE');
  });

  it('allows a plan change on an active subscription', () => {
    expect(service.canChangePlan(makeSub())).toEqual({ allowed: true });
  });

  it('blocks cancelling an already-terminal subscription', () => {
    const result = service.canCancelSubscription(
      makeSub({ terminal: true, statusStr: 'CANCELLED' }),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('CANCELLED');
  });

  it('allows cancelling an active subscription', () => {
    expect(service.canCancelSubscription(makeSub())).toEqual({ allowed: true });
  });

  it('blocks a billing-cycle change when not mid-cycle-changeable', () => {
    expect(
      service.validateBillingCycleChange(makeSub({ midCycle: false })).allowed,
    ).toBe(false);
  });
});

describe('SubscriptionValidationService.validatePaymentEligibility', () => {
  it('is ineligible when the subscription cannot renew', () => {
    const result = service.validatePaymentEligibility(
      makeSub({ canRenew: false }),
      NOW,
    );
    expect(result).toEqual({
      eligible: false,
      reason: 'Subscription cannot be renewed in current state',
    });
  });

  it('is ineligible when not yet due for renewal', () => {
    const result = service.validatePaymentEligibility(
      makeSub({ canRenew: true, due: false }),
      NOW,
    );
    expect(result.reason).toBe('Subscription is not yet due for renewal');
  });

  it('is eligible when renewable and due', () => {
    expect(
      service.validatePaymentEligibility(
        makeSub({ canRenew: true, due: true }),
        NOW,
      ),
    ).toEqual({ eligible: true });
  });
});

describe('SubscriptionValidationService.validateCreditApplication', () => {
  it('rejects a negative credit amount', () => {
    expect(service.validateCreditApplication(makeSub(), -1).valid).toBe(false);
  });

  it('rejects spending more than the available credits', () => {
    const result = service.validateCreditApplication(
      makeSub({ credits: 5000 }),
      6000,
    );
    expect(result).toEqual({
      valid: false,
      reason: 'Insufficient credits available',
    });
  });

  it('accepts a credit within the available balance', () => {
    expect(
      service.validateCreditApplication(makeSub({ credits: 5000 }), 5000).valid,
    ).toBe(true);
  });
});

describe('SubscriptionValidationService.validateDiscountApplication', () => {
  it.each([-1, 101])('rejects an out-of-range discount %i', (pct) => {
    expect(service.validateDiscountApplication(makeSub(), pct).valid).toBe(
      false,
    );
  });

  it('rejects a discount when the subscription has no plan', () => {
    const result = service.validateDiscountApplication(
      makeSub({ plan: null }),
      10,
    );
    expect(result.reason).toBe('Subscription has no plan assigned');
  });

  it('accepts a valid in-range discount on a planned subscription', () => {
    expect(service.validateDiscountApplication(makeSub(), 25).valid).toBe(true);
  });
});
