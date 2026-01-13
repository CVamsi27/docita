import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  SubscriptionSchema,
  SubscriptionTierConfigSchema,
  IntelligenceInfoSchema,
  CheckoutSessionSchema,
} from '@workspace/types';

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

export class AnyResponseDto extends createZodDto(z.any()) {}
