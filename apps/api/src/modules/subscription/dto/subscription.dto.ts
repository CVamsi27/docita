import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  SubscriptionSchema,
  SubscriptionConfigResponseSchema,
  SubscriptionTierConfigSchema,
  IntelligenceInfoSchema,
  CheckoutSessionSchema,
} from '@workspace/types';

export class SubscriptionResponseDto extends createZodDto(SubscriptionSchema) {}

export class SubscriptionTierConfigResponseDto extends createZodDto(
  SubscriptionConfigResponseSchema,
) {}

export class AddOnDto {
  id!: string;
  name!: string;
  description!: string;
  pricing!: Record<
    string,
    { basePrice: number | string; includedQuota: number; overageRate: number }
  >; // keyed by TierName
}
export class SubscriptionTierConfigListResponseDto extends createZodDto(
  z.array(SubscriptionTierConfigSchema),
) {}
export class IntelligenceInfoResponseDto extends createZodDto(
  IntelligenceInfoSchema,
) {}
export class CheckoutSessionResponseDto extends createZodDto(
  CheckoutSessionSchema,
) {}

// For preview endpoints which might be custom objects
export const UpgradePreviewSchema = z.object({
  prorationAmount: z.number(),
  nextBillingDate: z.string().or(z.date()),
  immediateCharge: z.number(),
});
export class UpgradePreviewResponseDto extends createZodDto(
  UpgradePreviewSchema,
) {}

// Request DTOs
export const CreateCheckoutSchema = z.object({
  tier: z.enum(['CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  referralCode: z.string().optional(),
  addOns: z.array(z.string()).optional(),
});
export class CreateCheckoutRequestDto extends createZodDto(
  CreateCheckoutSchema,
) {}

export const ActivateSubscriptionSchema = z.object({
  razorpayPaymentId: z.string(),
  razorpayOrderId: z.string(),
  razorpaySignature: z.string(),
  tier: z.enum(['CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']),
  addOns: z.array(z.string()).optional(),
});
export class ActivateSubscriptionRequestDto extends createZodDto(
  ActivateSubscriptionSchema,
) {}

export const UpgradeTierSchema = z.object({
  tier: z.string(),
});
export class UpgradeTierRequestDto extends createZodDto(UpgradeTierSchema) {}

export const SetIntelligenceSchema = z.object({
  enabled: z.boolean(),
});
export class SetIntelligenceRequestDto extends createZodDto(
  SetIntelligenceSchema,
) {}

export class AnyResponseDto extends createZodDto(z.any()) {}
