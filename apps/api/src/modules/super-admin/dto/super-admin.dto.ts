import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  superAdminGlobalStatsSchema,
  superAdminAnalyticsSchema,
  superAdminPerformanceMetricsSchema,
  superAdminAIFeatureCatalogSchema,
  superAdminClinicTierInfoSchema,
  superAdminTierPricingSchema,
  superAdminClinicListResponseSchema,
  auditLogSchema,
  userSchema,
} from '@workspace/types';

export class SuperAdminGlobalStatsResponseDto extends createZodDto(
  superAdminGlobalStatsSchema,
) {}
export class SuperAdminAnalyticsResponseDto extends createZodDto(
  superAdminAnalyticsSchema,
) {}
export class SuperAdminPerformanceMetricsResponseDto extends createZodDto(
  superAdminPerformanceMetricsSchema,
) {}
export class SuperAdminAIFeatureCatalogResponseDto extends createZodDto(
  superAdminAIFeatureCatalogSchema,
) {}
export class SuperAdminClinicTierInfoResponseDto extends createZodDto(
  superAdminClinicTierInfoSchema,
) {}
export class SuperAdminTierPricingResponseDto extends createZodDto(
  superAdminTierPricingSchema,
) {}
export class SuperAdminClinicListResponseDto extends createZodDto(
  superAdminClinicListResponseSchema,
) {}
export class SuperAdminLogListResponseDto extends createZodDto(
  z.array(auditLogSchema),
) {}
export class SuperAdminUserListResponseDto extends createZodDto(
  z.array(userSchema),
) {}
export class SuperAdminUserResponseDto extends createZodDto(userSchema) {}

// For generic success/failure
export class SuccessResponseDto extends createZodDto(
  z.object({ success: z.boolean(), message: z.string().optional() }),
) {}
