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
