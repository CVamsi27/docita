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
    status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
    amount: z.number(),
});

export const referralValidationSchema = z.object({
    valid: z.boolean(),
    discount: z.number().optional(),
    code: z.string().optional(),
    message: z.string().optional(),
});
