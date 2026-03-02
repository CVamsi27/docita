import { z } from 'zod';

export const CreateSubscriptionDtoSchema = z.object({
  clinicId: z.string().cuid('Invalid clinic ID'),
  plan: z.enum(['CAPTURE', 'CORE', 'GROWTH', 'SCALE', 'ENTERPRISE']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  trialEnd: z.date().optional(),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionDtoSchema>;

export interface SubscriptionResponseDto {
  id: string;
  clinicId: string;
  plan: string;
  billingCycle: string;
  status: string;
  basePriceCents: number;
  totalDiscountPercent: number;
  creditsCents: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  autoPayEnabled: boolean;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const UpgradeSubscriptionDtoSchema = z.object({
  subscriptionId: z.string().cuid(),
  newPlan: z.enum(['CORE', 'GROWTH', 'SCALE', 'ENTERPRISE']),
  immediate: z.boolean().default(true),
});

export type UpgradeSubscriptionDto = z.infer<
  typeof UpgradeSubscriptionDtoSchema
>;

export interface UpgradePreviewDto {
  currentPlan: string;
  newPlan: string;
  currentPriceCents: number;
  newPriceCents: number;
  creditCents: number;
  chargeCents: number;
  netAmountCents: number;
  daysRemaining: number;
  effectiveDate: string;
}

export const DowngradeSubscriptionDtoSchema = z.object({
  subscriptionId: z.string().cuid(),
  newPlan: z.enum(['CAPTURE', 'CORE', 'GROWTH', 'SCALE']),
  effectiveAt: z.enum(['IMMEDIATELY', 'END_OF_PERIOD']),
});

export type DowngradeSubscriptionDto = z.infer<
  typeof DowngradeSubscriptionDtoSchema
>;

export const ProcessPaymentDtoSchema = z.object({
  subscriptionId: z.string().cuid(),
  amountCents: z.number().positive(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
});

export type ProcessPaymentDto = z.infer<typeof ProcessPaymentDtoSchema>;

export const CancelSubscriptionDtoSchema = z.object({
  subscriptionId: z.string().cuid(),
  reason: z.string().optional(),
  immediate: z.boolean().default(false),
});

export type CancelSubscriptionDto = z.infer<typeof CancelSubscriptionDtoSchema>;

export interface PaymentResponseDto {
  id: string;
  subscriptionId: string;
  amountCents: number;
  status: string;
  invoiceUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export const ChangeBillingCycleDtoSchema = z.object({
  subscriptionId: z.string().cuid(),
  newCycle: z.enum(['MONTHLY', 'YEARLY']),
});

export type ChangeBillingCycleDto = z.infer<typeof ChangeBillingCycleDtoSchema>;

export interface SubscriptionListResponseDto {
  id: string;
  clinicId: string;
  plan: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
  autoPayEnabled: boolean;
}

export function validateCreateSubscription(
  data: unknown,
): CreateSubscriptionDto {
  return CreateSubscriptionDtoSchema.parse(data);
}
export function validateCancelSubscription(
  data: unknown,
): CancelSubscriptionDto {
  return CancelSubscriptionDtoSchema.parse(data);
}
export function validateUpgradeSubscription(
  data: unknown,
): UpgradeSubscriptionDto {
  return UpgradeSubscriptionDtoSchema.parse(data);
}

export function validateDowngradeSubscription(
  data: unknown,
): DowngradeSubscriptionDto {
  return DowngradeSubscriptionDtoSchema.parse(data);
}

export function validateProcessPayment(data: unknown): ProcessPaymentDto {
  return ProcessPaymentDtoSchema.parse(data);
}
