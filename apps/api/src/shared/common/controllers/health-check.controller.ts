import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { ObservabilityService } from '@/shared/modules/services/observability.service';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
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
  liveness(): {
    status: 'ok';
    service: string;
    uptime: number;
    timestamp: string;
  } {
    return {
      status: 'ok',
      service: 'docita-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Load-balancer readiness probe. Returns 503 when a critical dependency
   * (currently: Postgres) is unreachable so the pod is rotated out instead
   * of receiving traffic and 500-ing on every request.
   */
  @Public()
  @Get('/ready')
  @HttpCode(200)
  async readiness(): Promise<{
    ready: boolean;
    checks: Record<string, unknown>;
    timestamp: string;
  }> {
    const health = await this.observability.getSystemHealth();
    const ready = health.status === 'healthy';
    const body = {
      ready,
      checks: health.checks,
      timestamp: new Date().toISOString(),
    };

    if (!ready) {
      throw new ServiceUnavailableException(body);
    }

    return body;
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
