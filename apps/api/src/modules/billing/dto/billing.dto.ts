import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  BillingPortalUrlSchema,
  InvoiceSchema,
  PaymentMethodSchema,
  CheckoutSessionSchema,
  SubscriptionSchema,
  SubscriptionTierConfigSchema,
  IntelligenceInfoSchema,
} from '@workspace/types';

export class BillingPortalUrlResponseDto extends createZodDto(
  BillingPortalUrlSchema,
) {}
export class InvoiceListResponseDto extends createZodDto(
  z.array(InvoiceSchema),
) {}
export class PaymentMethodListResponseDto extends createZodDto(
  z.array(PaymentMethodSchema),
) {}
export class CheckoutSessionResponseDto extends createZodDto(
  CheckoutSessionSchema,
) {}
export class SubscriptionResponseDto extends createZodDto(SubscriptionSchema) {}
export class SubscriptionTierConfigResponseDto extends createZodDto(
  SubscriptionTierConfigSchema,
) {}
export class SubscriptionTierConfigListResponseDto extends createZodDto(
  z.array(SubscriptionTierConfigSchema),
) {}
export class IntelligenceInfoResponseDto extends createZodDto(
  IntelligenceInfoSchema,
) {}

export class AnyResponseDto extends createZodDto(z.any()) {}

// Tier change DTOs
export const ChangeTierSchema = z.object({
  tier: z.enum(['CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE']),
});

export class ChangeTierDto extends createZodDto(ChangeTierSchema) {}

export const TierChangeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  newTier: z.string().optional(),
  previousTier: z.string().optional(),
});

export class TierChangeResponseDto extends createZodDto(
  TierChangeResponseSchema,
) {}
