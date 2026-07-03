import { z } from 'zod';
import { MAX_REFERRAL_CREDITS_PER_YEAR } from '@workspace/types';

/**
 * Pure referral-reward computation. No DB, no side effects — the invariants the
 * business cares about (one-time, one-per-clinic, first-year-only, stepped rate
 * bands) live here so they are exhaustively unit-testable and cannot drift.
 *
 * Two reward tracks:
 *  - CLINIC        → free-subscription-month *credits*, earned by referral count
 *                    (milestone: N conversions → M free months, capped per year).
 *  - PHARMACY /    → cash *revenue-share* of the referred clinic's FIRST-YEAR
 *    MARKETING_*      billing, per stepped rate bands, one time only.
 */
export type ReferrerType =
  | 'CLINIC'
  | 'PHARMACY'
  | 'MARKETING_PERSON'
  | 'CUSTOM';

export type ReferrerRewardKind = 'CREDIT_MONTHS' | 'REVENUE_SHARE';

/** Revenue-share % over an inclusive, 1-based month index of the first year. */
export interface RateBand {
  fromMonth: number;
  toMonth: number;
  percent: number;
}

/** Only the first 12 billed months of a referred clinic ever earn a reward. */
export const REFERRAL_FIRST_YEAR_MONTHS = 12 as const;

/** Opening offer — pharmacy / general marketing: flat 5% of first-year billing. */
export const DEFAULT_PHARMACY_RATE_BANDS: readonly RateBand[] = [
  { fromMonth: 1, toMonth: 12, percent: 5 },
];

/** Special marketing person: 15% for months 1–6, then 5% for months 7–12. */
export const DEFAULT_SPECIAL_MARKETING_RATE_BANDS: readonly RateBand[] = [
  { fromMonth: 1, toMonth: 6, percent: 15 },
  { fromMonth: 7, toMonth: 12, percent: 5 },
];

export interface CreditMilestoneConfig {
  /** Conversions required per grant, e.g. 5. */
  perNReferrals: number;
  /** Free months granted per milestone reached, e.g. 1. */
  freeMonths: number;
  /** Hard cap on free months granted within a rolling year. */
  yearlyCap: number;
}

export const DEFAULT_CLINIC_CREDIT_MILESTONE: CreditMilestoneConfig = {
  perNReferrals: 5,
  freeMonths: 1,
  yearlyCap: MAX_REFERRAL_CREDITS_PER_YEAR,
};

/**
 * 1-based month index of a billing period relative to the referred clinic's
 * activation. The activation period is month 1. Returns 0 for periods before
 * activation (never earns).
 */
export function monthIndexForPeriod(
  activationAt: Date,
  periodStart: Date,
): number {
  const months =
    (periodStart.getUTCFullYear() - activationAt.getUTCFullYear()) * 12 +
    (periodStart.getUTCMonth() - activationAt.getUTCMonth());
  return months < 0 ? 0 : months + 1;
}

/** Revenue-share percent applicable to a given month index; 0 if none matches. */
export function resolveRateForMonth(
  bands: readonly RateBand[],
  monthIndex: number,
): number {
  const band = bands.find(
    (b) => monthIndex >= b.fromMonth && monthIndex <= b.toMonth,
  );
  return band ? band.percent : 0;
}

/**
 * Cash revenue share (integer paise) owed for one billing period. Returns 0
 * outside the first year, before activation, or when no band applies. Money is
 * kept in integer paise end-to-end.
 */
export function computeRevenueShareCents(params: {
  paidRevenueCents: number;
  monthIndex: number;
  bands: readonly RateBand[];
  firstYearOnly?: boolean;
}): number {
  const { paidRevenueCents, monthIndex, bands, firstYearOnly = true } = params;
  if (monthIndex < 1) return 0;
  if (firstYearOnly && monthIndex > REFERRAL_FIRST_YEAR_MONTHS) return 0;
  if (paidRevenueCents <= 0) return 0;
  const percent = resolveRateForMonth(bands, monthIndex);
  if (percent <= 0) return 0;
  return Math.round((paidRevenueCents * percent) / 100);
}

/**
 * Free months to grant NOW for a clinic referrer, given how many of its
 * referrals have converted and how many months were already granted this year.
 * Milestone-based (floor(conversions / perN) * freeMonths), capped per year.
 * Idempotent: re-running with the same inputs grants 0.
 */
export function computeCreditMilestoneGrant(params: {
  convertedReferrals: number;
  alreadyGrantedMonths: number;
  config?: CreditMilestoneConfig;
}): number {
  const { convertedReferrals, alreadyGrantedMonths } = params;
  const config = params.config ?? DEFAULT_CLINIC_CREDIT_MILESTONE;
  if (convertedReferrals < 0 || config.perNReferrals <= 0) return 0;
  const earned =
    Math.floor(convertedReferrals / config.perNReferrals) * config.freeMonths;
  const capped = Math.min(earned, config.yearlyCap);
  return Math.max(0, capped - Math.max(0, alreadyGrantedMonths));
}

/**
 * One-time / one-per-clinic guard. A referred clinic may generate a reward only
 * once, ever. `rewardClaimedAt` being set means the reward lifecycle is closed.
 */
export function isRewardClaimable(rewardClaimedAt: Date | null): boolean {
  return rewardClaimedAt === null;
}

/** Default rate bands for a referrer type (CUSTOM callers supply their own). */
export function defaultRateBandsForType(
  type: ReferrerType,
): readonly RateBand[] {
  switch (type) {
    case 'MARKETING_PERSON':
      return DEFAULT_SPECIAL_MARKETING_RATE_BANDS;
    case 'PHARMACY':
      return DEFAULT_PHARMACY_RATE_BANDS;
    case 'CLINIC':
    case 'CUSTOM':
      return [];
  }
}

export const rateBandSchema = z.object({
  fromMonth: z.number().int().min(1),
  toMonth: z.number().int().min(1),
  percent: z.number().min(0).max(100),
});
export const rateBandsSchema = z.array(rateBandSchema);

/**
 * Parse a `Referrer.rateBands` JSON column into rate bands, falling back to the
 * type's opening-offer bands when absent or malformed.
 */
export function parseRateBands(
  value: unknown,
  fallback: readonly RateBand[],
): readonly RateBand[] {
  const parsed = rateBandsSchema.safeParse(value);
  return parsed.success && parsed.data.length > 0 ? parsed.data : fallback;
}
