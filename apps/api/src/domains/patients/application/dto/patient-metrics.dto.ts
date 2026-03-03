import { createZodDto } from 'nestjs-zod';
import {
  createMetricCategorySchema,
  createMetricDefinitionSchema,
  upsertMetricSelectionsSchema,
  createPatientMetricValueSchema,
  metricHistoryQuerySchema,
} from '@workspace/types';

export class CreateMetricCategoryDto extends createZodDto(
  createMetricCategorySchema,
) {}

export class CreateMetricDefinitionDto extends createZodDto(
  createMetricDefinitionSchema,
) {}

export class UpsertMetricSelectionsDto extends createZodDto(
  upsertMetricSelectionsSchema,
) {}

export class CreatePatientMetricValueDto extends createZodDto(
  createPatientMetricValueSchema,
) {}

export class MetricHistoryQueryDto extends createZodDto(
  metricHistoryQuerySchema,
) {}
