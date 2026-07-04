import type { ReferrerType } from '@/domains/subscriptions/core/services/referral-reward.rules';

export const REFERRAL_PAYOUT_REPOSITORY_TOKEN = Symbol(
  'IReferralPayoutRepository',
);

export interface DueRevenueShareReferral {
  id: string;
  activationAt: Date | null;
  referredClinicId: string | null;
  referrer: {
    id: string;
    type: ReferrerType;
    rewardKind: string;
    active: boolean;
    firstYearOnly: boolean;
    rateBands: unknown;
  } | null;
}

export interface PaidPeriod {
  paidAt: Date | null;
  amountCents: number;
}

export interface CreateReferralPayoutInput {
  referralId: string;
  referrerId: string;
  periodStart: Date;
  periodEnd: Date;
  baseRevenueCents: number;
  ratePercent: number;
  amountCents: number;
}

export interface IReferralPayoutRepository {
  findExistingPayout(
    referralId: string,
    periodStart: Date,
  ): Promise<{ id: string } | null>;
  createPayout(input: CreateReferralPayoutInput): Promise<void>;
  findDueRevenueShareReferrals(): Promise<DueRevenueShareReferral[]>;
  findPaidPeriodsInWindow(
    clinicId: string,
    from: Date,
    toExclusive: Date,
  ): Promise<PaidPeriod[]>;
}
