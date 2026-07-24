export type ReferrerType =
  | "CLINIC"
  | "PHARMACY"
  | "MARKETING_PERSON"
  | "CUSTOM";

export type ReferrerRewardKind = "CREDIT_MONTHS" | "REVENUE_SHARE";

export type ReferralPayoutStatus = "PENDING" | "APPROVED" | "PAID" | "VOID";

export interface InternalReferrer {
  id: string;
  type: ReferrerType;
  rewardKind: ReferrerRewardKind;
  name: string;
  email: string | null;
  phone: string | null;
  clinicId: string | null;
  firstYearOnly: boolean;
  active: boolean;
  createdAt: string;
}

export interface InternalReferralPayout {
  id: string;
  referralId: string;
  referrerId: string;
  periodStart: string;
  periodEnd: string;
  baseRevenueCents: number;
  ratePercent: number;
  amountCents: number;
  status: ReferralPayoutStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface InternalReferralPayoutSummaryRow {
  status: ReferralPayoutStatus;
  count: number;
  totalCents: number;
}

export interface CreateInternalReferrerInput {
  type: ReferrerType;
  rewardKind?: ReferrerRewardKind;
  name: string;
  email?: string;
  phone?: string;
  clinicId?: string;
}
