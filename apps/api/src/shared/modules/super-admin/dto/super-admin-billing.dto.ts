import { createZodDto } from 'nestjs-zod';
import {
  extendGracePeriodRequestSchema,
  superAdminBillingExpiringQuerySchema,
  superAdminBillingPaymentsQuerySchema,
  superAdminBillingSubscriptionsQuerySchema,
} from '@workspace/types';

export class SuperAdminBillingSubscriptionsQueryDto extends createZodDto(
  superAdminBillingSubscriptionsQuerySchema,
) {}

export class SuperAdminBillingExpiringQueryDto extends createZodDto(
  superAdminBillingExpiringQuerySchema,
) {}

export class SuperAdminBillingPaymentsQueryDto extends createZodDto(
  superAdminBillingPaymentsQuerySchema,
) {}

export class ExtendGracePeriodRequestDto extends createZodDto(
  extendGracePeriodRequestSchema,
) {}
