import { createZodDto } from 'nestjs-zod';
import {
  subscriptionActivateLegacyRequestSchema,
  subscriptionCancelRequestSchema,
  subscriptionCheckoutRequestSchema,
} from '@workspace/types';

export class SubscriptionCheckoutRequestDto extends createZodDto(
  subscriptionCheckoutRequestSchema,
) {}

export class SubscriptionCancelRequestDto extends createZodDto(
  subscriptionCancelRequestSchema,
) {}

export class SubscriptionActivateLegacyRequestDto extends createZodDto(
  subscriptionActivateLegacyRequestSchema,
) {}
