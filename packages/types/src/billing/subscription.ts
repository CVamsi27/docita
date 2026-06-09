import { z } from "zod";

const pricingConfigSchema = z.object({
  monthly: z.number().or(z.literal("custom")),
  yearly: z.number().or(z.literal("custom")),
  currency: z.string(),
});

const tierMetaSchema = z.object({
  name: z.string(),
  description: z.string(),
  tagline: z.string(),
  color: z.string(),
  pricing: pricingConfigSchema,
  features: z.array(z.string()),
});

export const SubscriptionTierConfigSchema = tierMetaSchema.extend({
  id: z.string(),
  tier: z.number(),
  limits: z.object({
    patients: z.number(),
    doctors: z.number(),
    storageGB: z.number(),
    branches: z.number(),
    appointments: z.number().optional(),
    users: z.number().optional(),
    prescriptions: z.number().optional(),
    invoices: z.number().optional(),
  }),
});

export const IntelligenceInfoSchema = tierMetaSchema;

export const SubscriptionConfigResponseSchema = z.object({
  tiers: z.array(SubscriptionTierConfigSchema),
  featureTierMap: z.record(z.string(), z.number()),
  featureDisplay: z.record(
    z.string(),
    z.object({ name: z.string(), description: z.string() }),
  ),
  intelligenceInfo: IntelligenceInfoSchema,
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  status: z.string(),
  plan: z.string(), 
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  currentPeriodStart: z.date().or(z.string()),
  currentPeriodEnd: z.date().or(z.string()),
  cancelAtPeriodEnd: z.boolean(),
  trialEnd: z.date().or(z.string()).nullable().optional(),
  basePriceCents: z.number(),
  currency: z.string(),
});

export const CheckoutSessionSchema = z.object({
  orderId: z.string(),
  amountCents: z.number(),
  currency: z.string(),
  razorpayKeyId: z.string(),
  subscriptionId: z.string().optional(),
});
