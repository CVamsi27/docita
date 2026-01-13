import { z } from "zod";

export const SubscriptionTierConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    features: z.record(z.boolean()),
    limits: z.record(z.number()),
    price: z.number(),
});

export const SubscriptionSchema = z.object({
    id: z.string(),
    status: z.string(),
    tier: z.string(),
    currentPeriodStart: z.date().or(z.string()),
    currentPeriodEnd: z.date().or(z.string()),
    cancelAtPeriodEnd: z.boolean(),
    trialEnd: z.date().or(z.string()).nullable(),
});

export const IntelligenceInfoSchema = z.object({
    enabled: z.boolean(),
    price: z.number().optional(),
    usage: z.number().optional(),
});
