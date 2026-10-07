import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  internalGlobalStatsSchema,
  internalAnalyticsSchema,
  internalPerformanceMetricsSchema,
  internalAIFeatureCatalogSchema,
  internalClinicTierInfoSchema,
  internalTierPricingSchema,
  internalClinicListResponseSchema,
  listClinicsQuerySchema,
  auditLogSchema,
  internalClinicAdminListResponseSchema,
  internalClinicAdminSchema,
  internalAdminListEntrySchema,
  internalUserListEntrySchema,
  userSchema,
  successResponseSchema,
} from '@workspace/types';

export class InternalClinicListQueryDto extends createZodDto(
  listClinicsQuerySchema,
) {}

export class InternalGlobalStatsResponseDto extends createZodDto(
  internalGlobalStatsSchema,
) {}
export class InternalAnalyticsResponseDto extends createZodDto(
  internalAnalyticsSchema,
) {}
export class InternalPerformanceMetricsResponseDto extends createZodDto(
  internalPerformanceMetricsSchema,
) {}
export class InternalAIFeatureCatalogResponseDto extends createZodDto(
  internalAIFeatureCatalogSchema,
) {}
export class InternalClinicTierInfoResponseDto extends createZodDto(
  internalClinicTierInfoSchema,
) {}
export class InternalTierPricingResponseDto extends createZodDto(
  internalTierPricingSchema,
) {}
export class InternalClinicListResponseDto extends createZodDto(
  internalClinicListResponseSchema,
) {}
export class InternalLogListResponseDto extends createZodDto(
  z.array(auditLogSchema),
) {}
export class InternalUserListResponseDto extends createZodDto(
  z.array(userSchema),
) {}
export class InternalClinicAdminListResponseDto extends createZodDto(
  internalClinicAdminListResponseSchema,
) {}
export class InternalClinicAdminResponseDto extends createZodDto(
  internalClinicAdminSchema,
) {}
export class InternalUserResponseDto extends createZodDto(userSchema) {}

/** P5.11 — cross-clinic admins list (plain array). */
export class InternalAdminListResponseDto extends createZodDto(
  z.array(internalAdminListEntrySchema),
) {}

/** P5.11 — cross-clinic users list (plain array, clinicName attached). */
export class InternalUserListWithClinicResponseDto extends createZodDto(
  z.array(internalUserListEntrySchema),
) {}

export class SuccessResponseDto extends createZodDto(successResponseSchema) {}
