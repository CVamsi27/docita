import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_REVENUE_SHARE_RATE_BANDS,
  computeCreditMilestoneGrant,
  computeRevenueShareCents,
  defaultRateBandsForType,
  isRewardClaimable,
  monthIndexForPeriod,
  resolveRateForMonth,
} from './referral-reward.rules';

describe('resolveRateForMonth', () => {
  it('flat 10% across all 12 first-year months, 0 after', () => {
    const bands = DEFAULT_REVENUE_SHARE_RATE_BANDS;
    expect(resolveRateForMonth(bands, 1)).toBe(10);
    expect(resolveRateForMonth(bands, 6)).toBe(10);
    expect(resolveRateForMonth(bands, 12)).toBe(10);
    expect(resolveRateForMonth(bands, 13)).toBe(0);
    expect(resolveRateForMonth(bands, 0)).toBe(0);
  });

  it('returns 0 when no band matches the month', () => {
    expect(resolveRateForMonth([], 1)).toBe(0);
    expect(
      resolveRateForMonth([{ fromMonth: 2, toMonth: 4, percent: 10 }], 5),
    ).toBe(0);
  });
});

describe('monthIndexForPeriod', () => {
  const activation = new Date('2026-01-15T00:00:00Z');
  it('activation month is month 1', () => {
    expect(
      monthIndexForPeriod(activation, new Date('2026-01-28T00:00:00Z')),
    ).toBe(1);
  });
  it('counts calendar months forward (1-based)', () => {
    expect(
      monthIndexForPeriod(activation, new Date('2026-03-01T00:00:00Z')),
    ).toBe(3);
    expect(
      monthIndexForPeriod(activation, new Date('2027-01-01T00:00:00Z')),
    ).toBe(13);
  });
  it('returns 0 for periods before activation', () => {
    expect(
      monthIndexForPeriod(activation, new Date('2025-12-01T00:00:00Z')),
    ).toBe(0);
  });
});

describe('computeRevenueShareCents', () => {
  const bands = DEFAULT_REVENUE_SHARE_RATE_BANDS;
  const monthly = 249900; // ₹2499 in paise

  it('10% in an early month', () => {
    expect(
      computeRevenueShareCents({
        paidRevenueCents: monthly,
        monthIndex: 3,
        bands,
      }),
    ).toBe(24990);
  });

  it('10% in the final first-year month', () => {
    expect(
      computeRevenueShareCents({
        paidRevenueCents: monthly,
        monthIndex: 12,
        bands,
      }),
    ).toBe(24990);
  });

  it('0 after the first year (firstYearOnly default)', () => {
    expect(
      computeRevenueShareCents({
        paidRevenueCents: monthly,
        monthIndex: 13,
        bands,
      }),
    ).toBe(0);
  });

  it('0 before activation / non-positive revenue', () => {
    expect(
      computeRevenueShareCents({
        paidRevenueCents: monthly,
        monthIndex: 0,
        bands,
      }),
    ).toBe(0);
    expect(
      computeRevenueShareCents({ paidRevenueCents: 0, monthIndex: 3, bands }),
    ).toBe(0);
  });

  it('returns integer paise (no floats)', () => {
    const v = computeRevenueShareCents({
      paidRevenueCents: 99900,
      monthIndex: 1,
      bands,
    });
    expect(Number.isInteger(v)).toBe(true);
  });

  it('rounds the revenue share to the nearest paise', () => {
    expect(
      computeRevenueShareCents({
        paidRevenueCents: 33333,
        monthIndex: 1,
        bands,
      }),
    ).toBe(3333); // 3333.3 → 3333
    expect(
      computeRevenueShareCents({
        paidRevenueCents: 33335,
        monthIndex: 1,
        bands,
      }),
    ).toBe(3334); // 3333.5 → 3334
  });
});

describe('computeCreditMilestoneGrant', () => {
  it('grants 1 month at 5 conversions, 0 below the threshold', () => {
    expect(
      computeCreditMilestoneGrant({
        convertedReferrals: 5,
        alreadyGrantedMonths: 0,
      }),
    ).toBe(1);
    expect(
      computeCreditMilestoneGrant({
        convertedReferrals: 4,
        alreadyGrantedMonths: 0,
      }),
    ).toBe(0);
  });

  it('is idempotent — already-granted months are not re-granted', () => {
    expect(
      computeCreditMilestoneGrant({
        convertedReferrals: 5,
        alreadyGrantedMonths: 1,
      }),
    ).toBe(0);
    expect(
      computeCreditMilestoneGrant({
        convertedReferrals: 12,
        alreadyGrantedMonths: 1,
      }),
    ).toBe(1); // floor(12/5)=2 earned, 1 already granted
  });

  it('respects the yearly cap', () => {
    expect(
      computeCreditMilestoneGrant({
        convertedReferrals: 1000,
        alreadyGrantedMonths: 0,
        config: { perNReferrals: 5, freeMonths: 1, yearlyCap: 12 },
      }),
    ).toBe(12);
  });
});

describe('isRewardClaimable (one-time / one-per-clinic)', () => {
  it('claimable only while unclaimed', () => {
    expect(isRewardClaimable(null)).toBe(true);
    expect(isRewardClaimable(new Date())).toBe(false);
  });
});

describe('defaultRateBandsForType', () => {
  it('maps revenue-share types to the flat 10% first-year policy', () => {
    expect(defaultRateBandsForType('PHARMACY')).toBe(
      DEFAULT_REVENUE_SHARE_RATE_BANDS,
    );
    expect(defaultRateBandsForType('MARKETING_PERSON')).toBe(
      DEFAULT_REVENUE_SHARE_RATE_BANDS,
    );
    expect(defaultRateBandsForType('CLINIC')).toEqual([]);
    expect(defaultRateBandsForType('CUSTOM')).toEqual([]);
  });
});
