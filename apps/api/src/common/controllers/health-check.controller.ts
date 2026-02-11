import { Controller, Get, Version, UseGuards } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { ObservabilityService } from '../services/observability.service';

/**
 * Health Check Controller
 * Provides public health check endpoints for monitoring and orchestration
 */
@Controller('health')
@Version('1')
export class HealthCheckController {
  constructor(private observability: ObservabilityService) {}

  /**
   * Basic liveness probe (always returns 200 if API is responsive)
   * Used by load balancers and orchestration systems
   */
  @Public()
  @Get()
  async ping(): Promise<{ status: 'ok'; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Comprehensive health check including dependency status
   * Returns current state of database, Redis, and other critical services
   */
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
      status: health.status === 'healthy' ? 'ok' : health.status === 'degraded' ? 'degraded' : 'error',
      service: 'docita-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe - returns 200 only if all dependencies are healthy
   * Used to determine if the service is ready to accept traffic
   */
  @Public()
  @Get('/ready')
  async readiness(): Promise<{
    ready: boolean;
    checks: Record<string, any>;
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

  /**
   * Database health specifically
   * Useful for monitoring database-specific issues
   */
  @Public()
  @Get('/db')
  async databaseHealth(): Promise<Record<string, any>> {
    return this.observability.getDatabaseHealth();
  }

  /**
   * Metrics endpoint (Prometheus-compatible format can be added later)
   * Returns current metrics buffer
   */
  @Public()
  @Get('/metrics')
  async metrics(): Promise<Record<string, any>> {
    return this.observability.getMetricsSummary();
  }

  /**
   * System metrics (memory, CPU, uptime)
   */
  @Public()
  @Get('/system')
  async systemMetrics(): Promise<{
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: string;
  }> {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }
}
