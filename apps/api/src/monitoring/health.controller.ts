import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    memory: {
      status: string;
      heapUsed: number;
      heapTotal: number;
      rss: number;
      heapUsagePercent: number;
    };
    cpu: { status: string; user: number; system: number };
  };
}

@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    const checks = await this.performChecks();

    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };
  }

  @Get('live')
  async liveness(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  @Get('ready')
  async readiness(): Promise<{ status: string; database: boolean }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: true };
    } catch {
      return { status: 'not ready', database: false };
    }
  }

  private async performChecks(): Promise<HealthCheckResult['checks']> {
    // Database check
    const dbCheck = await this.checkDatabase();

    // Memory check
    const memoryCheck = this.checkMemory();

    // CPU check
    const cpuCheck = this.checkCpu();

    return {
      database: dbCheck,
      memory: memoryCheck,
      cpu: cpuCheck,
    };
  }

  private async checkDatabase(): Promise<{
    status: string;
    latency?: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      if (latency > 1000) {
        return { status: 'degraded', latency };
      }

      return { status: 'healthy', latency };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private checkMemory(): {
    status: string;
    heapUsed: number;
    heapTotal: number;
    rss: number;
    heapUsagePercent: number;
  } {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    // Node.js heap grows dynamically. We should check against RSS (actual memory usage)
    // and use a reasonable threshold. Typical Node.js apps can use up to 1.5GB by default.
    const maxHeapMB = 1400; // Consider unhealthy if approaching Node's default heap limit
    const heapUsagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);

    let status = 'healthy';
    // Check absolute memory usage rather than just percentage
    if (rssMB > maxHeapMB || heapUsedMB > 1200) {
      status = 'unhealthy';
    } else if (rssMB > 1000 || heapUsedMB > 800) {
      status = 'degraded';
    }
    // High percentage is normal in Node.js as heap grows on demand

    return {
      status,
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      rss: rssMB,
      heapUsagePercent,
    };
  }

  private checkCpu(): { status: string; user: number; system: number } {
    const cpuUsage = process.cpuUsage();

    return {
      status: 'healthy',
      user: Math.round(cpuUsage.user / 1000000),
      system: Math.round(cpuUsage.system / 1000000),
    };
  }

  private determineOverallStatus(
    checks: HealthCheckResult['checks'],
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = [
      checks.database.status,
      checks.memory.status,
      checks.cpu.status,
    ];

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }
}
