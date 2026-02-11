import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HealthCheckService {
  private readonly startTime = Date.now();

  constructor(private prisma: PrismaService) {}

  async getSystemHealth(): Promise<{
    uptime: number;
    memoryUsage: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    cpuUsage: { user: number; system: number };
    databaseConnected: boolean;
    lastErrors: number;
    avgResponseTime: number;
    requestsLastHour: number;
    errorsLastHour: number;
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    let databaseConnected = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }

    const [requestsLastHour, errorsLastHour, avgResponse, recentErrors] =
      await Promise.all([
        this.prisma.apiRequest.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        this.prisma.errorLog.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        this.prisma.apiRequest.aggregate({
          where: { createdAt: { gte: oneHourAgo } },
          _avg: { duration: true },
        }),
        this.prisma.errorLog.count({
          where: { createdAt: { gte: oneHourAgo }, resolved: false },
        }),
      ]);

    return {
      uptime: Date.now() - this.startTime,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      cpuUsage: {
        user: cpuUsage.user / 1000000,
        system: cpuUsage.system / 1000000,
      },
      databaseConnected,
      lastErrors: recentErrors,
      avgResponseTime: avgResponse._avg.duration || 0,
      requestsLastHour,
      errorsLastHour,
    };
  }
}
