import { describe, expect, it } from '@jest/globals';
import {
  SUPPORTED_PRICING_CURRENCIES,
  getWhatsappBillableConfig,
  mapDbTierStringToCanonicalTier,
  mapPricingTierInputToTierName,
  readNumber,
  resolveCurrency,
} from './pricing-helpers';

describe('mapDbTierStringToCanonicalTier', () => {
  it('upper-cases a known lower-case tier', () => {
    expect(mapDbTierStringToCanonicalTier('essential')).toBe('ESSENTIAL');
  });

  it('passes through an already-canonical tier', () => {
    expect(mapDbTierStringToCanonicalTier('PROFESSIONAL')).toBe('PROFESSIONAL');
  });

  it('falls back to STARTER for an unknown tier', () => {
    expect(mapDbTierStringToCanonicalTier('NOT_A_TIER')).toBe('STARTER');
  });
});

describe('mapPricingTierInputToTierName', () => {
  it('rejects the INTELLIGENCE add-on tier as a pricing plan', () => {
    expect(mapPricingTierInputToTierName('INTELLIGENCE')).toBeNull();
  });

  it('normalises a valid tier input', () => {
    expect(mapPricingTierInputToTierName('professional')).toBe('PROFESSIONAL');
  });
});

describe('resolveCurrency', () => {
  it('resolves a supported currency case-insensitively', () => {
    expect(resolveCurrency(SUPPORTED_PRICING_CURRENCIES, 'usd')).toBe('USD');
  });

  it('falls back to the first supported currency for an unsupported one', () => {
    expect(resolveCurrency(SUPPORTED_PRICING_CURRENCIES, 'JPY')).toBe(
      SUPPORTED_PRICING_CURRENCIES[0],
    );
  });

  it('falls back when no currency is supplied', () => {
    expect(resolveCurrency(SUPPORTED_PRICING_CURRENCIES)).toBe(
      SUPPORTED_PRICING_CURRENCIES[0],
    );
  });

  it('defaults to INR when the supported list is empty', () => {
    expect(resolveCurrency([], 'USD')).toBe('INR');
  });
});

describe('readNumber', () => {
  it('returns a finite number as-is', () => {
    expect(readNumber(42)).toBe(42);
  });

  it.each([NaN, Infinity, -Infinity, 'x', null, undefined, {}])(
    'returns the fallback for the non-finite value %p',
    (value) => {
      expect(readNumber(value, 7)).toBe(7);
    },
  );

  it('defaults the fallback to 0', () => {
    expect(readNumber('nope')).toBe(0);
  });
});

describe('getWhatsappBillableConfig', () => {
  it('returns a zero quota for a non-billable tier', () => {
    expect(getWhatsappBillableConfig('STARTER', 'INR')).toEqual({
      includedQuota: 0,
      overageRate: 0,
    });
  });

  it('returns numeric quota + overage for a billable tier', () => {
    const config = getWhatsappBillableConfig('ESSENTIAL', 'INR');
    expect(typeof config.includedQuota).toBe('number');
    expect(typeof config.overageRate).toBe('number');
    expect(config.includedQuota).toBeGreaterThanOrEqual(0);
  });
});
