import { Controller, Get, Inject } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PerformanceService } from './performance.service';
import {
  DatabaseStatsResponseDto,
  AppPerformanceMetricsResponseDto,
  HealthCheckResponseDto,
} from './dto/performance.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';

@Controller('performance')
@Roles(Role.ADMIN, Role.INTERNAL)
export class PerformanceController {
  constructor(
    private readonly performanceService: PerformanceService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  @Get('db-stats')
  @ZodSerializerDto(DatabaseStatsResponseDto)
  async getDatabaseStats() {
    return this.performanceService.getDatabaseStats();
  }

  @Get('metrics')
  @ZodSerializerDto(AppPerformanceMetricsResponseDto)
  getMetrics() {
    return this.performanceService.getMetrics();
  }

  @Get('health')
  @ZodSerializerDto(HealthCheckResponseDto)
  getHealth() {
    return {
      status: 'ok',
      timestamp: this.clock.now().toISOString(),
    };
  }
}
