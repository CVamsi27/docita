import { z } from "zod";
import { planModeSchema, tierSchema } from "../billing/tier";
import { invoiceTaxSummarySchema, taxInvoiceTypeSchema } from "../billing/tax";

const billingCycleSchema = z.enum(["MONTHLY", "YEARLY"]);
const estimateBillingCycleSchema = z.enum(["monthly", "yearly"]);
const booleanStringSchema = z.enum(["true", "false"]);

export const subscriptionCheckoutRequestSchema = z
  .object({
    tier: tierSchema,
    cycle: billingCycleSchema,
    referrals: z.array(z.string()).optional(),
  })
  .strict();

export const subscriptionCancelRequestSchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict();

export const subscriptionActivateLegacyRequestSchema = z
  .object({
    tier: tierSchema,
    cycle: billingCycleSchema,
  })
  .strict();

export const pricingConfigQuerySchema = z
  .object({
    currency: z.string().optional(),
  })
  .strict();

export const pricingEstimateQuerySchema = z
  .object({
    tier: tierSchema,
    currency: z.string().optional(),
    billingCycle: estimateBillingCycleSchema.optional(),
    consultations: z.coerce.number().int().min(0).optional(),
    appointments: z.coerce.number().int().min(0).optional(), // legacy read alias
    users: z.coerce.number().int().min(0).optional(),
    whatsappMessages: z.coerce.number().int().min(0).optional(),
    whatsapp: booleanStringSchema.optional(), // legacy read alias
  })
  .strict();

export const pricingEstimateRequestSchema = z
  .object({
    tier: tierSchema,
    currency: z.string().optional(),
    billingCycle: estimateBillingCycleSchema.optional(),
    consultations: z.number().int().min(0).optional(),
    appointments: z.number().int().min(0).optional(), // legacy read alias
    users: z.number().int().min(0).optional(),
    whatsappMessages: z.number().int().min(0).optional(),
    whatsapp: z.boolean().optional(), // legacy read alias
  })
  .strict();

export const subscriptionBillingPreviewQuerySchema = z
  .object({
    tier: tierSchema,
    cycle: billingCycleSchema,
  })
  .strict();

export const subscriptionBillingCheckoutRequestSchema = z
  .object({
    tier: tierSchema,
    billingCycle: billingCycleSchema,
    /** Plan mode toggle (Full / Front Desk / Core). Defaults to FULL. */
    planMode: planModeSchema.optional().default("FULL"),
    referralCode: z.string().optional(),
  })
  .strict();

export const subscriptionBillingActivateRequestSchema = z
  .object({
    razorpayPaymentId: z.string(),
    razorpayOrderId: z.string(),
    razorpaySignature: z.string(),
    tier: tierSchema,
    billingCycle: billingCycleSchema,
    /** Plan mode toggle (Full / Front Desk / Core). Defaults to FULL. */
    planMode: planModeSchema.optional().default("FULL"),
  })
  .strict();

export const subscriptionBillingCancelRequestSchema = z
  .object({
    immediate: z.boolean().optional(),
  })
  .strict();

export const subscriptionBillingScheduleChangeRequestSchema = z
  .object({
    tier: tierSchema,
    billingCycle: billingCycleSchema,
    /** Plan mode toggle (Full / Front Desk / Core). Defaults to FULL. */
    planMode: planModeSchema.optional().default("FULL"),
  })
  .strict();
export type SubscriptionBillingScheduleChangeRequest = z.infer<
  typeof subscriptionBillingScheduleChangeRequestSchema
>;

export const subscriptionBillingPaymentHistoryItemSchema = z
  .object({
    id: z.string(),
    amountCents: z.number().int().min(0),
    amount: z.number().min(0).optional(), // legacy read alias
    subtotalCents: z.number().int().min(0).optional(),
    taxCents: z.number().int().min(0).optional(),
    grandTotalCents: z.number().int().min(0).optional(),
    currency: z.string(),
    status: z.string(),
    description: z.string().optional(),
    invoiceUrl: z.string().optional(),
    payUrl: z.string().optional(),
    receiptUrl: z.string().optional(),
    invoiceNumber: z.string().optional(),
    invoiceType: taxInvoiceTypeSchema.optional(),
    taxSummary: invoiceTaxSummarySchema.optional(),
    paidAt: z.string().optional(),
    createdAt: z.string(),
  })
  .strict();

export const subscriptionBillingResumePaymentResponseSchema = z
  .object({
    id: z.string(),
    payUrl: z.string(),
  })
  .strict();

export const subscriptionBillingPaymentHistoryResponseSchema = z
  .array(subscriptionBillingPaymentHistoryItemSchema)
  .readonly();

const pricingEstimateChargeSchema = z
  .object({
    count: z.number().int().min(0),
    charge: z.number().min(0),
  })
  .strict();

const pricingAmountSchema = z.union([z.number().min(0), z.literal("custom")]);

export const pricingEstimateResponseSchema = z
  .object({
    tier: tierSchema,
    billingCycle: estimateBillingCycleSchema,
    currency: z
      .object({
        code: z.string(),
        symbol: z.string(),
      })
      .strict(),
    breakdown: z
      .object({
        basePrice: z.number().min(0),
        subtotal: z.number().min(0),
        discount: z
          .object({
            percent: z.number().min(0),
            amount: z.number().min(0),
          })
          .strict(),
        overages: z
          .object({
            consultations: pricingEstimateChargeSchema,
            users: pricingEstimateChargeSchema,
            whatsappMessages: pricingEstimateChargeSchema,
          })
          .strict(),
        overageTotal: z.number().min(0),
      })
      .strict(),
    totalMonthly: z.number().min(0),
    totalYearly: z.number().min(0),
  })
  .strict();

const pricingConfigCurrencySchema = z
  .object({
    code: z.string(),
    symbol: z.string(),
    name: z.string(),
  })
  .strict();

const pricingConfigTierSchema = z
  .object({
    id: tierSchema,
    name: z.string(),
    description: z.string(),
    tagline: z.string(),
    color: z.string(),
    pricing: z
      .object({
        monthly: pricingAmountSchema,
        yearly: pricingAmountSchema,
        currency: z.string(),
      })
      .strict(),
    limits: z
      .object({
        patients: z.number().int().min(0),
        appointments: z.number().int().min(0),
        storage: z.number().int().min(0),
        users: z.number().int().min(0),
        doctors: z.number().int().min(0),
        branches: z.number().int().min(0),
        prescriptions: z.number().int().min(0).optional(),
        invoices: z.number().int().min(0).optional(),
        billable: z
          .object({
            consultations: z.number().int().min(0),
            users: z.number().int().min(0),
            whatsappMessages: z.number().int().min(0),
          })
          .strict(),
      })
      .strict(),
    features: z.array(z.string()),
  })
  .strict();

export const pricingConfigResponseSchema = z
  .object({
    currency: pricingConfigCurrencySchema,
    supportedCurrencies: z.array(pricingConfigCurrencySchema),
    tiers: z.array(pricingConfigTierSchema),
    discounts: z
      .object({
        annualPercent: z.number().min(0),
        semiAnnualPercent: z.number().min(0),
        referralCredits: z.number().min(0),
      })
      .strict(),
  })
  .strict();

const trialWindowStateSchema = z.enum(["ACTIVE", "GRACE", "EXPIRED"]);

const subscriptionCurrentItemSchema = z
  .object({
    id: z.string(),
    clinicId: z.string(),
    tier: tierSchema,
    tierName: tierSchema,
    subscriptionStatus: z.string(),
    billingCycle: billingCycleSchema,
    basePriceCents: z.number().int().min(0),
    currency: z.string(),
    cancelAtPeriodEnd: z.boolean(),
    currentPeriodStart: z.string(),
    currentPeriodEnd: z.string(),
    daysRemaining: z.number().int().min(0),
    trialEnd: z.string().nullable().optional(),
    trialWindowState: trialWindowStateSchema.nullable().optional(),
    trialGraceEndsAt: z.string().nullable().optional(),
    scheduledChange: z
      .object({
        plan: z.string(),
        billingCycle: z.string(),
        effectiveAt: z.string(),
      })
      .strict()
      .nullable()
      .optional(),
    accountCreditCents: z.number().int().min(0).optional(),
    hasOutstandingPendingPayment: z.boolean().optional(),
  })
  .strict();

export const subscriptionCurrentResponseSchema =
  subscriptionCurrentItemSchema.nullable();

/** Prisma `Subscription.scheduledChange`. */
export const scheduledPlanChangeJsonSchema = z
  .object({
    plan: z.string(),
    billingCycle: z.string(),
    effectiveAt: z.string(),
    /** Optional PlanMode for the scheduled change. Defaults to FULL on apply. */
    planMode: planModeSchema.optional(),
  })
  .strict();

const subscriptionDiscountJsonSchema = z.object({
  type: z.string(),
  percentOff: z.number(),
  expiresAt: z.string().optional(),
  description: z.string().optional(),
});

/** Prisma `Subscription.discountsApplied`. */
export const subscriptionDiscountsAppliedJsonSchema = z.array(
  subscriptionDiscountJsonSchema,
);

const scheduledPlanChangeSchema = scheduledPlanChangeJsonSchema;

const subscriptionBillingStatusItemSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    tier: tierSchema,
    billingCycle: billingCycleSchema,
    basePriceCents: z.number().int().min(0),
    currentPeriodStart: z.string(),
    currentPeriodEnd: z.string(),
    cancelAtPeriodEnd: z.boolean(),
    trialEnd: z.string().nullable().optional(),
    trialWindowState: trialWindowStateSchema.nullable().optional(),
    trialGraceEndsAt: z.string().nullable().optional(),
    scheduledChange: scheduledPlanChangeSchema.nullable().optional(),
    accountCreditCents: z.number().int().min(0).optional(),
  })
  .strict();

export const subscriptionBillingStatusResponseSchema = z
  .object({
    subscription: subscriptionBillingStatusItemSchema.nullable(),
    referralCredits: z.number().min(0),
    pendingReferralDiscount: z.number().min(0),
    lastPayment: z
      .object({
        amount: z.number().min(0),
        currency: z.string(),
        date: z.string(),
        status: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const subscriptionBillingPreviewResponseSchema = z
  .object({
    currentTier: tierSchema.nullable(),
    newTier: tierSchema,
    currentCycle: billingCycleSchema.nullable(),
    newCycle: billingCycleSchema,
    creditCents: z.number().int().min(0),
    chargeCents: z.number().int().min(0),
    daysRemaining: z.number().int().min(0),
    billingCycleDays: z.number().int().positive(),
    finalAmountCents: z.number().int().min(0),
  })
  .strict();

const subscriptionBillingCheckoutPrefillSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    contact: z.string().optional(),
  })
  .strict();

export const subscriptionBillingCheckoutResponseSchema = z
  .object({
    orderId: z.string(),
    amountCents: z.number().int().min(0),
    currency: z.string(),
    razorpayKeyId: z.string(),
    completedWithoutPayment: z.boolean().optional(),
    prefill: subscriptionBillingCheckoutPrefillSchema.optional(),
  })
  .strict();

export const subscriptionBillingActivateResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .strict();

export const subscriptionBillingCancelResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .strict();

export const internalBillingSubscriptionsQuerySchema = z
  .object({
    tier: z.string().optional(),
    status: z.string().optional(),
    billingCycle: z.string().optional(),
  })
  .strict();

export const internalBillingExpiringQuerySchema = z
  .object({
    days: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const internalBillingPaymentsQuerySchema = z
  .object({
    clinicId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .strict();

/** One-off charges recorded from the internal app (e.g. guided setup). */
export const internalAdditionalChargeCategorySchema = z.enum([
  "GUIDED_SETUP",
  "DATA_MIGRATION",
  "CUSTOM_TRAINING",
  "INTEGRATION",
  "COMMERCIAL_DISCOUNT",
  "OTHER",
]);

export const recordInternalAdditionalChargeRequestSchema = z
  .object({
    amount: z.number().positive("Amount must be greater than zero"),
    currency: z.string().length(3).optional(),
    category: internalAdditionalChargeCategorySchema,
    paymentMethod: z.enum(["razorpay", "stripe", "bank_transfer", "manual"]),
    razorpayPaymentId: z.string().min(1).max(128).optional(),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export const internalBillingPaymentItemSchema = z.object({
  id: z.string(),
  clinicName: z.string(),
  planLabel: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  gatewayPaymentId: z.string().optional(),
  description: z.string().optional(),
  paidAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const extendGracePeriodRequestSchema = z
  .object({
    days: z.number().int().positive("Days must be a positive integer"),
  })
  .strict();

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
export type PricingConfigResponse = z.infer<typeof pricingConfigResponseSchema>;
export type SubscriptionBillingPreviewQuery = z.infer<
  typeof subscriptionBillingPreviewQuerySchema
>;
export type SubscriptionBillingCheckoutRequest = z.infer<
  typeof subscriptionBillingCheckoutRequestSchema
>;
export type SubscriptionBillingCheckoutResponse = z.infer<
  typeof subscriptionBillingCheckoutResponseSchema
>;
export type SubscriptionBillingActivateRequest = z.infer<
  typeof subscriptionBillingActivateRequestSchema
>;
export type SubscriptionBillingActivateResponse = z.infer<
  typeof subscriptionBillingActivateResponseSchema
>;
export type SubscriptionBillingCancelRequest = z.infer<
  typeof subscriptionBillingCancelRequestSchema
>;
export type SubscriptionBillingCancelResponse = z.infer<
  typeof subscriptionBillingCancelResponseSchema
>;
export type SubscriptionBillingPaymentHistoryItem = z.infer<
  typeof subscriptionBillingPaymentHistoryItemSchema
>;
export type SubscriptionBillingPaymentHistoryResponse = z.infer<
  typeof subscriptionBillingPaymentHistoryResponseSchema
>;
export type SubscriptionBillingResumePaymentResponse = z.infer<
  typeof subscriptionBillingResumePaymentResponseSchema
>;
export type SubscriptionCurrentResponse = z.infer<
  typeof subscriptionCurrentResponseSchema
>;
export type SubscriptionBillingStatusResponse = z.infer<
  typeof subscriptionBillingStatusResponseSchema
>;
export type SubscriptionBillingPreviewResponse = z.infer<
  typeof subscriptionBillingPreviewResponseSchema
>;
export type PricingEstimateResponse = z.infer<
  typeof pricingEstimateResponseSchema
>;
export type InternalBillingSubscriptionsQuery = z.infer<
  typeof internalBillingSubscriptionsQuerySchema
>;
export type InternalBillingExpiringQuery = z.infer<
  typeof internalBillingExpiringQuerySchema
>;
export type InternalBillingPaymentsQuery = z.infer<
  typeof internalBillingPaymentsQuerySchema
>;
export type InternalAdditionalChargeCategory = z.infer<
  typeof internalAdditionalChargeCategorySchema
>;
export type RecordInternalAdditionalChargeRequest = z.infer<
  typeof recordInternalAdditionalChargeRequestSchema
>;
export type InternalBillingPaymentItem = z.infer<
  typeof internalBillingPaymentItemSchema
>;
export type ExtendGracePeriodRequest = z.infer<
  typeof extendGracePeriodRequestSchema
>;
