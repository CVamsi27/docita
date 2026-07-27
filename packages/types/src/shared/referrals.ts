import { z } from "zod";

export const referralCodeSchema = z.object({
  code: z.string(),
  clinicId: z.string(),
  discountPercentage: z.number().optional(),
  commissionPercentage: z.number().optional(),
  createdAt: z.date().or(z.string()),
});

export const referralStatsSchema = z.object({
  totalReferrals: z.number(),
  totalEarnings: z.number(),
  pendingPayouts: z.number(),
});

export const referralUsageSchema = z.object({
  id: z.string(),
  referredClinicId: z.string(),
  referredClinicName: z.string().optional(),
  date: z.date().or(z.string()),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]),
  amount: z.number(),
});

export const referralValidationSchema = z.object({
  valid: z.boolean(),
  discount: z.number().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

export const referrerRateBandsJsonSchema = z.array(
  z.object({
    fromMonth: z.number().int().min(1),
    toMonth: z.number().int().min(1),
    percent: z.number().min(0).max(100),
  }),
);
export type ReferrerRateBands = z.infer<typeof referrerRateBandsJsonSchema>;

export const referrerCreditConfigJsonSchema = z.object({
  perNReferrals: z.number().int().min(1),
  freeMonths: z.number().int().min(0),
  yearlyCap: z.number().int().min(0),
});
export type ReferrerCreditConfig = z.infer<typeof referrerCreditConfigJsonSchema>;

export const referrerPayoutDetailsJsonSchema = z.record(z.string(), z.unknown());
export type ReferrerPayoutDetails = z.infer<
  typeof referrerPayoutDetailsJsonSchema
>;

// ---------------------------------------------------------------------------
// Referral partner self-service (2026-07-27 migration).
//
// `Referrer` (PHARMACY / MARKETING_PERSON / CUSTOM / CLINIC) gets a short
// human-shareable `code` (`RFR-XXXXXX`) so the partner can read it aloud on a
// call or paste it into a WhatsApp message. The code is the partner-portal
// share-link key and is also the discount key at clinic onboarding / payment.
// ---------------------------------------------------------------------------

/** RFR- prefix + 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. */
export const REFERRER_CODE_PREFIX = "RFR-" as const;
export const REFERRER_CODE_SUFFIX_LENGTH = 6;
export const REFERRER_CODE_SUFFIX_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" as const;
export const REFERRER_CODE_REGEX = /^RFR-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
export const REFERRER_CODE_TOTAL_LENGTH = 10;

export const referrerCodeSchema = z
  .string()
  .regex(REFERRER_CODE_REGEX, "Invalid referral partner code");
export type ReferrerCode = z.infer<typeof referrerCodeSchema>;

export const referrerCodeResolutionSchema = z.object({
  kind: z.enum(["PARTNER", "CLINIC", "NONE"]),
  /** Present when kind = "PARTNER". */
  referrerId: z.string().optional(),
  /** Present when kind = "CLINIC". */
  clinicId: z.string().optional(),
});
export type ReferrerCodeResolution = z.infer<
  typeof referrerCodeResolutionSchema
>;

/** Banking / payout details the partner submits from the portal. */
export const referrerPayoutDetailsInputSchema = z.object({
  accountHolder: z.string().min(2).max(200),
  accountNumber: z
    .string()
    .regex(/^\d{9,18}$/, "Account number must be 9-18 digits"),
  ifsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC (format: AAAA0XXXXXX)"),
  bankName: z.string().min(2).max(200),
  upiId: z
    .string()
    .regex(/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/, "Invalid UPI ID")
    .optional(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN (format: AAAAA9999A)")
    .optional(),
});
export type ReferrerPayoutDetailsInput = z.infer<
  typeof referrerPayoutDetailsInputSchema
>;

/** Server-side projection of the upserted payout details (no PII beyond last4). */
export const referrerPayoutDetailsViewSchema = z.object({
  referrerId: z.string(),
  accountHolder: z.string(),
  accountNumberLast4: z.string(),
  ifsc: z.string(),
  bankName: z.string(),
  upiId: z.string().optional(),
  panLast4: z.string().optional(),
  verified: z.boolean(),
  updatedAt: z.string(),
});
export type ReferrerPayoutDetailsView = z.infer<
  typeof referrerPayoutDetailsViewSchema
>;

/** What the partner sees on `/partner/me`. */
export const partnerMeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["CLINIC", "PHARMACY", "MARKETING_PERSON", "CUSTOM"]),
  rewardKind: z.enum(["CREDIT_MONTHS", "REVENUE_SHARE"]),
  code: z.string(),
  loginUrl: z.string().url(),
  showcasePdfUrl: z.string().url(),
  signupUrl: z.string().url(),
  shareMessage: z.string(),
  active: z.boolean(),
  payoutDetails: referrerPayoutDetailsViewSchema.nullable(),
  counts: z.object({
    referrals: z.number().int().min(0),
    converted: z.number().int().min(0),
    pendingPayoutsCents: z.number().int().min(0),
    paidPayoutsCents: z.number().int().min(0),
  }),
});
export type PartnerMe = z.infer<typeof partnerMeSchema>;

/** Single payout row in the partner portal payouts view. */
export const partnerPayoutRowSchema = z.object({
  id: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  referredClinicName: z.string().optional(),
  baseRevenueCents: z.number().int(),
  ratePercent: z.number().int().min(0).max(100),
  amountCents: z.number().int(),
  status: z.enum(["PENDING", "APPROVED", "PAID", "VOID"]),
  paidAt: z.string().nullable(),
});
export type PartnerPayoutRow = z.infer<typeof partnerPayoutRowSchema>;

export const partnerReferralRowSchema = z.object({
  id: z.string(),
  referredClinicId: z.string(),
  referredClinicName: z.string().optional(),
  status: z.enum(["PENDING", "SIGNED_UP", "CONVERTED", "REJECTED", "EXPIRED"]),
  createdAt: z.string(),
  convertedAt: z.string().nullable(),
});
export type PartnerReferralRow = z.infer<typeof partnerReferralRowSchema>;

/** Body for `POST /partner/auth/request-otp`. */
export const partnerOtpRequestSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid phone number with country code"),
});
export type PartnerOtpRequest = z.infer<typeof partnerOtpRequestSchema>;

export const partnerOtpVerifySchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Enter a valid phone number with country code"),
  otp: z.string().regex(/^\d{4,8}$/, "Enter the OTP sent to your phone"),
});
export type PartnerOtpVerify = z.infer<typeof partnerOtpVerifySchema>;

export const partnerOtpVerifyResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  referrer: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    type: z.enum(["CLINIC", "PHARMACY", "MARKETING_PERSON", "CUSTOM"]),
  }),
});
export type PartnerOtpVerifyResponse = z.infer<
  typeof partnerOtpVerifyResponseSchema
>;

/** Apply a referral code from clinic onboarding or settings. */
export const applyReferralCodeRequestSchema = z.object({
  code: z.string().min(3).max(40),
});
export type ApplyReferralCodeRequest = z.infer<
  typeof applyReferralCodeRequestSchema
>;

export const applyReferralCodeResponseSchema = z.object({
  applied: z.boolean(),
  source: z.enum(["PARTNER", "CLINIC"]).optional(),
  referrerId: z.string().optional(),
  clinicId: z.string().optional(),
  message: z.string().optional(),
});
export type ApplyReferralCodeResponse = z.infer<
  typeof applyReferralCodeResponseSchema
>;

/** Operator-facing message log entry on the internal referrals page. */
export const referrerMessageLogEntrySchema = z.object({
  id: z.string(),
  kind: z.enum(["WELCOME", "RESEND_WELCOME", "PAYOUT_NOTICE"]),
  channel: z.string(),
  template: z.string(),
  status: z.enum(["QUEUED", "SENT", "FAILED"]),
  externalId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
});
export type ReferrerMessageLogEntry = z.infer<
  typeof referrerMessageLogEntrySchema
>;

/** What the operator sees on the internal referrals page (extended). */
export const internalReferrerViewSchema = z.object({
  id: z.string(),
  type: z.enum(["CLINIC", "PHARMACY", "MARKETING_PERSON", "CUSTOM"]),
  rewardKind: z.enum(["CREDIT_MONTHS", "REVENUE_SHARE"]),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  code: z.string().nullable(),
  clinicId: z.string().nullable(),
  active: z.boolean(),
  welcomeSentAt: z.string().nullable(),
  welcomeError: z.string().nullable(),
  hasPayoutDetails: z.boolean(),
  payoutDetailsVerified: z.boolean(),
  createdAt: z.string(),
});
export type InternalReferrerView = z.infer<typeof internalReferrerViewSchema>;

