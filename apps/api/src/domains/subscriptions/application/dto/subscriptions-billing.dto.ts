import { createZodDto } from 'nestjs-zod';
import {
  subscriptionBillingActivateRequestSchema,
  subscriptionBillingCancelRequestSchema,
  subscriptionBillingCheckoutRequestSchema,
  subscriptionBillingPaymentHistoryResponseSchema,
  subscriptionBillingPreviewQuerySchema,
  subscriptionBillingResumePaymentResponseSchema,
} from '@workspace/types';

export class SubscriptionBillingPreviewQueryDto extends createZodDto(
  subscriptionBillingPreviewQuerySchema,
) {}

export class SubscriptionBillingCheckoutRequestDto extends createZodDto(
  subscriptionBillingCheckoutRequestSchema,
) {}

export class SubscriptionBillingActivateRequestDto extends createZodDto(
  subscriptionBillingActivateRequestSchema,
) {}

export class SubscriptionBillingCancelRequestDto extends createZodDto(
  subscriptionBillingCancelRequestSchema,
) {}

export class SubscriptionBillingPaymentHistoryResponseDto extends createZodDto(
  subscriptionBillingPaymentHistoryResponseSchema,
) {}

export class SubscriptionBillingResumePaymentResponseDto extends createZodDto(
  subscriptionBillingResumePaymentResponseSchema,
) {}
