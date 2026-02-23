import { Controller, Get } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import {
  DatabaseStatsResponseDto,
  AppPerformanceMetricsResponseDto,
  HealthCheckResponseDto,
} from './dto/performance.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { Role } from '@workspace/db';
import { Roles } from '../auth/roles.decorator';

@Controller('performance')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

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
      timestamp: new Date().toISOString(),
    };
  }
}
