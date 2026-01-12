import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, HealthCheckResult } from './health.service';

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    return this.healthService.getHealth();
  }

  @Get('live')
  liveness(): Promise<{ status: string }> {
    return Promise.resolve({ status: 'ok' });
  }

  @Get('ready')
  async readiness(): Promise<{ status: string; database: boolean }> {
    return this.healthService.getReadiness();
  }
}
