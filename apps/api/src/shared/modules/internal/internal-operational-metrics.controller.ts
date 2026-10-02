import { Controller, Get } from '@nestjs/common';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { internalOperationalMetricsSchema } from '@workspace/types';
import { InternalApiAccess } from './internal.controller.access';
import { InternalOperationalMetricsService } from './internal-operational-metrics.service';
class InternalOperationalMetricsResponseDto extends createZodDto(
  internalOperationalMetricsSchema,
) {}
@Controller('internal')
@InternalApiAccess()
export class InternalOperationalMetricsController {
  constructor(private readonly metrics: InternalOperationalMetricsService) {}
  @Get('operational-metrics')
  @ZodSerializerDto(InternalOperationalMetricsResponseDto)
  getMetrics() {
    return this.metrics.getMetrics();
  }
}
