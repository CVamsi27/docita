import { Controller, Get } from '@nestjs/common';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { ObservabilityService } from '@/shared/modules/services/observability.service';

@Controller('health')
export class HealthCheckController {
  constructor(private observability: ObservabilityService) {}

  @Public()
  @Get()
  ping(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('/live')
  async liveness(): Promise<{
    status: 'ok' | 'degraded' | 'error';
    service: string;
    uptime: number;
    timestamp: string;
  }> {
    const health = await this.observability.getSystemHealth();

    return {
      status:
        health.status === 'healthy'
          ? 'ok'
          : health.status === 'degraded'
            ? 'degraded'
            : 'error',
      service: 'docita-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('/ready')
  async readiness(): Promise<{
    ready: boolean;
    checks: Record<string, unknown>;
    timestamp: string;
  }> {
    const health = await this.observability.getSystemHealth();
    const ready = health.status === 'healthy';

    return {
      ready,
      checks: health.checks,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('/db')
  async databaseHealth(): Promise<Record<string, unknown>> {
    return this.observability.getDatabaseHealth();
  }

  @Public()
  @Get('/metrics')
  metrics(): Record<string, unknown> {
    return this.observability.getMetricsSummary();
  }

  @Public()
  @Get('/system')
  systemMetrics(): {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: string;
  } {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }
}
