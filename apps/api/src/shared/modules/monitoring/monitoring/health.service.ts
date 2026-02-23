import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface HealthCheckResult {
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

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  async getHealth(): Promise<HealthCheckResult> {
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

  async getReadiness(): Promise<{ status: string; database: boolean }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: true };
    } catch {
      return { status: 'not ready', database: false };
    }
  }

  private async performChecks(): Promise<HealthCheckResult['checks']> {
    return {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
      cpu: this.checkCpu(),
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

      return {
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private checkMemory() {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    const maxHeapMB = 1400;
    const heapUsagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);

    let status = 'healthy';
    if (rssMB > maxHeapMB || heapUsedMB > 1200) {
      status = 'unhealthy';
    } else if (rssMB > 1000 || heapUsedMB > 800) {
      status = 'degraded';
    }

    return {
      status,
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      rss: rssMB,
      heapUsagePercent,
    };
  }

  private checkCpu() {
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
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }
}
