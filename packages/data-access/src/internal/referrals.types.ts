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
  code: string | null;
  clinicId: string | null;
  firstYearOnly: boolean;
  active: boolean;
  welcomeSentAt: string | null;
  welcomeError: string | null;
  hasPayoutDetails: boolean;
  payoutDetailsVerified: boolean;
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

export type ReferrerMessageKind = "WELCOME" | "RESEND_WELCOME" | "PAYOUT_NOTICE";
export type ReferrerMessageStatus = "QUEUED" | "SENT" | "FAILED";

export interface ReferrerMessageLogEntry {
  id: string;
  kind: ReferrerMessageKind;
  channel: string;
  template: string;
  status: ReferrerMessageStatus;
  externalId: string | null;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface CreateInternalReferrerInput {
  type: ReferrerType;
  rewardKind?: ReferrerRewardKind;
  name: string;
  email?: string;
  phone?: string;
  clinicId?: string;
}
