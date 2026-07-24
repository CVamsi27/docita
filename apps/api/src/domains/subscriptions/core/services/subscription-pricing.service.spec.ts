import { describe, expect, it } from '@jest/globals';
import { ANNUAL_DISCOUNT_PERCENT } from '@workspace/types';
import { SubscriptionPricingService } from './subscription-pricing.service';
import {
  BillingCycle,
  ClinicTier,
  DiscountAggregate,
} from '@/domains/subscriptions/core/value-objects';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

const service = new SubscriptionPricingService();
const tier = ClinicTier.fromString('PROFESSIONAL');
const monthly = BillingCycle.fromString('MONTHLY');
const yearly = BillingCycle.fromString('YEARLY');

describe('SubscriptionPricingService.getPricePaise', () => {
  it('returns a positive monthly price in paise', () => {
    const paise = service.getPricePaise(tier, monthly);
    expect(paise).toBeGreaterThan(0);
    expect(Number.isInteger(paise)).toBe(true);
  });

  it('prices the yearly cycle independently of the monthly cycle', () => {
    const yearlyPaise = service.getPricePaise(tier, yearly);
    expect(yearlyPaise).toBeGreaterThan(0);
    expect(yearlyPaise).not.toBe(service.getPricePaise(tier, monthly));
  });

  it('applies a percentage discount by rounding off the base', () => {
    const base = service.getPricePaise(tier, monthly);
    expect(service.getPricePaise(tier, monthly, 20)).toBe(
      Math.round(base * 0.8),
    );
  });

  it('throws for the non-plan INTELLIGENCE tier', () => {
    expect(() =>
      service.getPricePaise(ClinicTier.fromString('INTELLIGENCE'), monthly),
    ).toThrow(InvariantViolationError);
  });
});

describe('SubscriptionPricingService misc', () => {
  it('calculatePrice matches getPricePaise', () => {
    expect(service.calculatePrice(tier, monthly, 10)).toBe(
      service.getPricePaise(tier, monthly, 10),
    );
  });

  it('exposes the configured annual discount', () => {
    expect(service.getAnnualDiscount()).toBe(ANNUAL_DISCOUNT_PERCENT);
  });

  it('suggestPlanChange reports both tiers’ prices', () => {
    const starter = ClinicTier.fromString('STARTER');
    expect(service.suggestPlanChange(starter, tier, monthly)).toEqual({
      current: service.getPricePaise(starter, monthly),
      new: service.getPricePaise(tier, monthly),
    });
  });

  it('getEffectivePrice with no discounts equals the base price', () => {
    const effective = service.getEffectivePrice(
      tier,
      monthly,
      new DiscountAggregate(),
    );
    expect(effective.paise).toBe(service.getPricePaise(tier, monthly));
  });
});
