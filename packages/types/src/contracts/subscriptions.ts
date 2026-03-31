import { z } from "zod";
import { tierSchema } from "../billing/tier";

const billingCycleSchema = z.enum(["MONTHLY", "YEARLY"]);
const estimateBillingCycleSchema = z.enum(["monthly", "yearly"]);
const booleanStringSchema = z.enum(["true", "false"]);

export const subscriptionCheckoutRequestSchema = z.object({
  tier: tierSchema,
  cycle: billingCycleSchema,
  referrals: z.array(z.string()).optional(),
}).strict();

export const subscriptionCancelRequestSchema = z.object({
  reason: z.string().optional(),
}).strict();

export const subscriptionActivateLegacyRequestSchema = z.object({
  tier: tierSchema,
  cycle: billingCycleSchema,
}).strict();

export const pricingConfigQuerySchema = z.object({
  currency: z.string().optional(),
}).strict();

export const pricingEstimateQuerySchema = z.object({
  tier: tierSchema,
  currency: z.string().optional(),
  billingCycle: estimateBillingCycleSchema.optional(),
  consultations: z.coerce.number().int().min(0).optional(),
  appointments: z.coerce.number().int().min(0).optional(), // legacy read alias
  users: z.coerce.number().int().min(0).optional(),
  whatsappMessages: z.coerce.number().int().min(0).optional(),
  whatsapp: booleanStringSchema.optional(), // legacy read alias
}).strict();

export const pricingEstimateRequestSchema = z.object({
  tier: tierSchema,
  currency: z.string().optional(),
  billingCycle: estimateBillingCycleSchema.optional(),
  consultations: z.number().int().min(0).optional(),
  appointments: z.number().int().min(0).optional(), // legacy read alias
  users: z.number().int().min(0).optional(),
  whatsappMessages: z.number().int().min(0).optional(),
  whatsapp: z.boolean().optional(), // legacy read alias
}).strict();

export const subscriptionBillingPreviewQuerySchema = z.object({
  tier: tierSchema,
  cycle: billingCycleSchema,
}).strict();

export const subscriptionBillingCheckoutRequestSchema = z.object({
  tier: tierSchema,
  billingCycle: billingCycleSchema,
  referralCode: z.string().optional(),
}).strict();

export const subscriptionBillingActivateRequestSchema = z.object({
  razorpayPaymentId: z.string(),
  razorpayOrderId: z.string(),
  razorpaySignature: z.string(),
  tier: tierSchema,
  billingCycle: billingCycleSchema,
}).strict();

export const subscriptionBillingCancelRequestSchema = z.object({
  immediate: z.boolean().optional(),
}).strict();

export const subscriptionBillingPaymentHistoryItemSchema = z
  .object({
    id: z.string(),
    amountCents: z.number().int().min(0),
    amount: z.number().min(0).optional(), // legacy read alias
    currency: z.string(),
    status: z.string(),
    description: z.string().optional(),
    invoiceUrl: z.string().optional(),
    invoiceNumber: z.string().optional(),
    paidAt: z.string().optional(),
    createdAt: z.string(),
  })
  .strict();

export const subscriptionBillingPaymentHistoryResponseSchema = z
  .array(subscriptionBillingPaymentHistoryItemSchema)
  .readonly();

const pricingEstimateChargeSchema = z.object({
  count: z.number().int().min(0),
  charge: z.number().min(0),
}).strict();

export const pricingEstimateResponseSchema = z.object({
  tier: tierSchema,
  billingCycle: estimateBillingCycleSchema,
  currency: z.object({
    code: z.string(),
    symbol: z.string(),
  }).strict(),
  breakdown: z.object({
    basePrice: z.number().min(0),
    subtotal: z.number().min(0),
    discount: z.object({
      percent: z.number().min(0),
      amount: z.number().min(0),
    }).strict(),
    overages: z.object({
      consultations: pricingEstimateChargeSchema,
      users: pricingEstimateChargeSchema,
      whatsappMessages: pricingEstimateChargeSchema,
    }).strict(),
    overageTotal: z.number().min(0),
  }).strict(),
  totalMonthly: z.number().min(0),
  totalYearly: z.number().min(0),
}).strict();

export const superAdminBillingSubscriptionsQuerySchema = z.object({
  tier: z.string().optional(),
  status: z.string().optional(),
  billingCycle: z.string().optional(),
}).strict();

export const superAdminBillingExpiringQuerySchema = z.object({
  days: z.coerce.number().int().positive().optional(),
}).strict();

export const superAdminBillingPaymentsQuerySchema = z.object({
  clinicId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).strict();

export const extendGracePeriodRequestSchema = z.object({
  days: z.number().int().positive("Days must be a positive integer"),
}).strict();

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
export type SubscriptionBillingPaymentHistoryItem = z.infer<
  typeof subscriptionBillingPaymentHistoryItemSchema
>;
export type SubscriptionBillingPaymentHistoryResponse = z.infer<
  typeof subscriptionBillingPaymentHistoryResponseSchema
>;
export type PricingEstimateResponse = z.infer<
  typeof pricingEstimateResponseSchema
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
