import { createZodDto } from 'nestjs-zod';
import {
  extendGracePeriodRequestSchema,
  internalBillingExpiringQuerySchema,
  internalBillingPaymentsQuerySchema,
  internalBillingSubscriptionsQuerySchema,
} from '@workspace/types';

export class InternalBillingSubscriptionsQueryDto extends createZodDto(
  internalBillingSubscriptionsQuerySchema,
) {}

export class InternalBillingExpiringQueryDto extends createZodDto(
  internalBillingExpiringQuerySchema,
) {}

export class InternalBillingPaymentsQueryDto extends createZodDto(
  internalBillingPaymentsQuerySchema,
) {}

export class ExtendGracePeriodRequestDto extends createZodDto(
  extendGracePeriodRequestSchema,
) {}
