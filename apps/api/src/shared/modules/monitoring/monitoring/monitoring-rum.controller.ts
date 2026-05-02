import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { MonitoringService } from './monitoring.service';
import {
  AnyResponseDto,
  WebVitalDto,
  WebVitalSchema,
} from './dto/monitoring.dto';

/**
 * Anonymous browser RUM (Core Web Vitals). Separated from {@link MonitoringController}
 * so class-level INTERNAL role guards cannot block unauthenticated POSTs.
 */
@Controller('monitoring')
export class MonitoringRumController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Public()
  @Post('web-vitals')
  @Throttle({
    short: { ttl: 60_000, limit: 240 },
    medium: { ttl: 3_600_000, limit: 5_000 },
  })
  @ZodSerializerDto(AnyResponseDto)
  @UsePipes(new ZodValidationPipe(WebVitalSchema))
  async reportWebVital(@Body() vital: WebVitalDto) {
    return this.monitoringService.recordWebVital(vital);
  }
}
