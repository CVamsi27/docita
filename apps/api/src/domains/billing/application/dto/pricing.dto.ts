import { createZodDto } from 'nestjs-zod';
import {
  pricingConfigQuerySchema,
  pricingEstimateQuerySchema,
} from '@workspace/types';

export class PricingConfigQueryDto extends createZodDto(
  pricingConfigQuerySchema,
) {}

export class PricingEstimateQueryDto extends createZodDto(
  pricingEstimateQuerySchema,
) {}
