import { z } from "zod";

export const subscriptionCheckoutRequestSchema = z.object({
  tier: z.string(),
  cycle: z.string(),
  referrals: z.array(z.string()).optional(),
});

export const subscriptionCancelRequestSchema = z.object({
  reason: z.string().optional(),
});

export const subscriptionActivateLegacyRequestSchema = z.object({
  tier: z.string(),
  cycle: z.string(),
});

export const pricingConfigQuerySchema = z.object({
  currency: z.string().optional(),
});

export const pricingEstimateQuerySchema = z.object({
  tier: z.string(),
  currency: z.string().optional(),
  billingCycle: z.string().optional(),
  patients: z.coerce.number().int().min(0).optional(),
  appointments: z.coerce.number().int().min(0).optional(),
  users: z.coerce.number().int().min(0).optional(),
  whatsapp: z.string().optional(),
  whatsappMessages: z.coerce.number().int().min(0).optional(),
  intelligence: z.string().optional(),
  aiCredits: z.coerce.number().int().min(0).optional(),
});

export const pricingEstimateRequestSchema = z.object({
  tier: z.string(),
  currency: z.string().optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
  patients: z.number().int().min(0).optional(),
  appointments: z.number().int().min(0).optional(),
  users: z.number().int().min(0).optional(),
  whatsapp: z.boolean().optional(),
  whatsappMessages: z.number().int().min(0).optional(),
  intelligence: z.boolean().optional(),
  aiCredits: z.number().int().min(0).optional(),
});

export const subscriptionBillingPreviewQuerySchema = z.object({
  tier: z.string(),
  cycle: z.string(),
});

export const subscriptionBillingCheckoutRequestSchema = z.object({
  tier: z.string(),
  billingCycle: z.string(),
  referralCode: z.string().optional(),
});

export const subscriptionBillingActivateRequestSchema = z.object({
  razorpayPaymentId: z.string(),
  razorpayOrderId: z.string(),
  razorpaySignature: z.string(),
  tier: z.string(),
  billingCycle: z.string(),
});

export const subscriptionBillingCancelRequestSchema = z.object({
  immediate: z.boolean().optional(),
});

export const superAdminBillingSubscriptionsQuerySchema = z.object({
  tier: z.string().optional(),
  status: z.string().optional(),
  billingCycle: z.string().optional(),
});

export const superAdminBillingExpiringQuerySchema = z.object({
  days: z.coerce.number().int().positive().optional(),
});

export const superAdminBillingPaymentsQuerySchema = z.object({
  clinicId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const extendGracePeriodRequestSchema = z.object({
  days: z.number().int().positive("Days must be a positive integer"),
});

export type SubscriptionCheckoutRequest = z.infer<
  typeof subscriptionCheckoutRequestSchema
>;
export type SubscriptionCancelRequest = z.infer<
  typeof subscriptionCancelRequestSchema
>;
export type SubscriptionActivateLegacyRequest = z.infer<
  typeof subscriptionActivateLegacyRequestSchema
>;
export type PricingConfigQuery = z.infer<typeof pricingConfigQuerySchema>;
export type PricingEstimateQuery = z.infer<typeof pricingEstimateQuerySchema>;
export type PricingEstimateRequest = z.infer<
  typeof pricingEstimateRequestSchema
>;
export type SubscriptionBillingPreviewQuery = z.infer<
  typeof subscriptionBillingPreviewQuerySchema
>;
export type SubscriptionBillingCheckoutRequest = z.infer<
  typeof subscriptionBillingCheckoutRequestSchema
>;
export type SubscriptionBillingActivateRequest = z.infer<
  typeof subscriptionBillingActivateRequestSchema
>;
export type SubscriptionBillingCancelRequest = z.infer<
  typeof subscriptionBillingCancelRequestSchema
>;
export type SuperAdminBillingSubscriptionsQuery = z.infer<
  typeof superAdminBillingSubscriptionsQuerySchema
>;
export type SuperAdminBillingExpiringQuery = z.infer<
  typeof superAdminBillingExpiringQuerySchema
>;
export type SuperAdminBillingPaymentsQuery = z.infer<
  typeof superAdminBillingPaymentsQuerySchema
>;
export type ExtendGracePeriodRequest = z.infer<
  typeof extendGracePeriodRequestSchema
>;
