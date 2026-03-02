import { z } from "zod";
import { tierSchema, featureSchema } from "./tier";

export const SubscriptionTierConfigSchema = z.object({
  id: z.string(),
  tier: z.number(),
  name: z.string(),
  description: z.string(),
  tagline: z.string(),
  color: z.string(),
  pricing: z.object({
    monthly: z.number().or(z.literal("custom")),
    yearly: z.number().or(z.literal("custom")),
    currency: z.string(),
  }),
  limits: z.object({
    patients: z.number(),
    doctors: z.number(),
    storageGB: z.number(),
    branches: z.number(),
  }),
  features: z.array(z.string()),
});

export const AddOnSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pricing: z.record(
    z.string(), 
    z.object({
      basePrice: z.number().or(z.literal("custom")),
      includedQuota: z.number(),
      overageRate: z.number(),
    }),
  ),
});

export const IntelligenceAddonSchema = z.object({
  feature: featureSchema,
  name: z.string(),
  description: z.string(),
  monthlyPrice: z.number(),
  icon: z.string(),
});

export const IntelligenceInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  tagline: z.string(),
  color: z.string(),
  pricing: z.object({
    monthly: z.number().or(z.literal("custom")),
    yearly: z.number().or(z.literal("custom")),
    currency: z.string(),
  }),
  features: z.array(z.string()),
});

export const SubscriptionConfigResponseSchema = z.object({
  tiers: z.array(SubscriptionTierConfigSchema),
  featureTierMap: z.record(z.string(), z.number()),
  featureDisplay: z.record(
    z.string(),
    z.object({ name: z.string(), description: z.string() }),
  ),
  intelligenceAddons: z.array(IntelligenceAddonSchema),
  intelligenceBundleDiscount: z.number(),
  intelligenceInfo: IntelligenceInfoSchema,
  addOns: z.array(AddOnSchema).optional(), 
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
