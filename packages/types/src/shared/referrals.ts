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
