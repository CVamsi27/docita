import {
  Injectable,
  InternalServerErrorException,
  Inject,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { InvoiceStatus } from '@workspace/db';
import { getMonthRange, DEFAULT_TIMEZONE } from '@workspace/utils';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import { HealthService } from '@/shared/modules/monitoring/monitoring/health.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

@Injectable()
export class InternalAnalyticsService {
  private readonly logger = new Logger(InternalAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly monitoringService: MonitoringService,
    private readonly healthService: HealthService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async getGlobalStats(timezone: string = DEFAULT_TIMEZONE) {
    try {
      const cacheKey = `internal:global-stats:${timezone}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
      const readClient = this.getReadClient();

      const now = this.clock.now();
      const thisMonthRange = getMonthRange(now, { timezone });
      const lastMonthDate = new Date(now);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthRange = getMonthRange(lastMonthDate, { timezone });

      const [clinics, users, doctors, patients, invoices, prescriptions] =
        await Promise.all([
          readClient.clinic.count(),
          readClient.user.count(),
          readClient.user.count({ where: { role: 'DOCTOR' } }),
          readClient.patient.count(),
          readClient.invoice.count(),
          readClient.prescription.count(),
        ]);

      const [
        clinicsThisMonth,
        usersThisMonth,
        doctorsThisMonth,
        patientsThisMonth,
        invoicesThisMonth,
        prescriptionsThisMonth,
      ] = await Promise.all([
        readClient.clinic.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        readClient.user.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        readClient.user.count({
          where: {
            role: 'DOCTOR',
            createdAt: { gte: thisMonthRange.start },
          },
        }),
        readClient.patient.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        readClient.invoice.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        readClient.prescription.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
      ]);

      const [invoicesLastMonth, prescriptionsLastMonth] = await Promise.all([
        readClient.invoice.count({
          where: {
            createdAt: { gte: lastMonthRange.start, lte: lastMonthRange.end },
          },
        }),
        readClient.prescription.count({
          where: {
            createdAt: { gte: lastMonthRange.start, lte: lastMonthRange.end },
          },
        }),
      ]);

      const invoicesPercentChange =
        invoicesLastMonth > 0
          ? Math.round(
              ((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) *
                100,
            )
          : invoicesThisMonth > 0
            ? 100
            : 0;

      const prescriptionsPercentChange =
        prescriptionsLastMonth > 0
          ? Math.round(
              ((prescriptionsThisMonth - prescriptionsLastMonth) /
                prescriptionsLastMonth) *
                100,
            )
          : prescriptionsThisMonth > 0
            ? 100
            : 0;

      const result = {
        clinics,
        users,
        doctors,
        patients,
        invoices,
        prescriptions,
        trends: {
          clinicsThisMonth,
          usersThisMonth,
          doctorsThisMonth,
          patientsThisMonth,
          invoicesPercentChange,
          prescriptionsPercentChange,
        },
      };

      await this.cacheManager.set(cacheKey, result, 300 * 1000);
      return result;
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch global stats');
    }
  }

  async getAnalytics(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly',
    startDate?: string,
    endDate?: string,
  ) {
    try {
      const now = this.clock.now();
      const start = startDate
        ? new Date(startDate)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate ? new Date(endDate) : now;
      const cacheKey = `internal:analytics:${period}:${start.toISOString()}:${end.toISOString()}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }

      const readClient = this.getReadClient();

      const [invoiceStats, appointmentsCount, newPatientsCount] =
        await Promise.all([
          readClient.invoice.aggregate({
            where: {
              createdAt: { gte: start, lte: end },
              status: InvoiceStatus.PAID,
            },
            _sum: { total: true },
            _avg: { total: true },
          }),
          readClient.appointment.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
          readClient.patient.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
        ]);

      const revenue = invoiceStats._sum?.total || 0;
      const avgInvoiceValue = Number(invoiceStats._avg?.total || 0);

      const periodLength = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - periodLength);
      const prevEnd = new Date(end.getTime() - periodLength);

      const [prevRevenue, prevAppointments, prevPatients] = await Promise.all([
        readClient.invoice.aggregate({
          where: {
            createdAt: { gte: prevStart, lte: prevEnd },
            status: InvoiceStatus.PAID,
          },
          _sum: { total: true },
        }),
        readClient.appointment.count({
          where: { createdAt: { gte: prevStart, lte: prevEnd } },
        }),
        readClient.patient.count({
          where: { createdAt: { gte: prevStart, lte: prevEnd } },
        }),
      ]);

      const prevRevenueTotal = prevRevenue._sum?.total || 0;
      const revenueChange =
        prevRevenueTotal > 0
          ? ((revenue - prevRevenueTotal) / prevRevenueTotal) * 100
          : 0;
      const appointmentsChange =
        prevAppointments > 0
          ? ((appointmentsCount - prevAppointments) / prevAppointments) * 100
          : 0;
      const patientsChange =
        prevPatients > 0
          ? ((newPatientsCount - prevPatients) / prevPatients) * 100
          : 0;

      const result = {
        revenue: Number(revenue),
        appointments: appointmentsCount,
        newPatients: newPatientsCount,
        avgInvoiceValue: Number(avgInvoiceValue),
        revenueChange: Number(revenueChange.toFixed(2)),
        appointmentsChange: Number(appointmentsChange.toFixed(2)),
        patientsChange: Number(patientsChange.toFixed(2)),
      };

      await this.cacheManager.set(cacheKey, result, 300 * 1000);
      return result;
    } catch (error) {
      this.logger.error('Failed to fetch analytics data', error);
      throw new InternalServerErrorException('Failed to fetch analytics data');
    }
  }

  async getPerformanceMetrics() {
    try {
      const [systemHealth, detailedHealth] = await Promise.all([
        this.monitoringService.getSystemHealth(),
        this.healthService.getHealth(),
      ]);

      const errorRate =
        systemHealth.requestsLastHour > 0
          ? Number(
              (
                (systemHealth.errorsLastHour / systemHealth.requestsLastHour) *
                100
              ).toFixed(2),
            )
          : 0;

      return {
        uptimeSeconds: Math.round(systemHealth.uptime / 1000),
        uptimeFormatted: this.formatDuration(systemHealth.uptime / 1000),
        avgResponseTime: Number(systemHealth.avgResponseTime.toFixed(2)),
        requestsLastHour: systemHealth.requestsLastHour,
        requestsPerMinute: Number(
          (systemHealth.requestsLastHour / 60).toFixed(2),
        ),
        errorsLastHour: systemHealth.errorsLastHour,
        errorRate,
        memoryUsage: systemHealth.memoryUsage,
        cpuUsage: systemHealth.cpuUsage,
        databaseConnected: systemHealth.databaseConnected,
        lastErrors: systemHealth.lastErrors,
        healthChecks: [
          {
            name: 'API Server',
            status: detailedHealth.status,
            value: detailedHealth.version,
            description: `Uptime: ${this.formatDuration(detailedHealth.uptime)}`,
          },
          {
            name: 'Database',
            status: systemHealth.databaseConnected ? 'healthy' : 'critical',
            value: systemHealth.databaseConnected ? 'Connected' : 'Offline',
            description: `Last hour latency: ${detailedHealth.checks.database.latency ?? 'N/A'}ms`,
          },
          {
            name: 'Memory',
            status: detailedHealth.checks.memory.status,
            value: `${detailedHealth.checks.memory.heapUsed}MB used`,
            description: `${detailedHealth.checks.memory.heapUsagePercent}% heap usage`,
          },
          {
            name: 'CPU',
            status: detailedHealth.checks.cpu.status,
            value: `${detailedHealth.checks.cpu.user + detailedHealth.checks.cpu.system}s`,
            description: 'Process CPU time since startup',
          },
        ],
      };
    } catch (_error) {
      throw new InternalServerErrorException(
        'Failed to fetch performance metrics',
      );
    }
  }

  private formatDuration(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  async getUsageMetrics() {
    try {
      const cacheKey = 'internal:usage-metrics';
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
      const readClient = this.getReadClient();

      const now = this.clock.now();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        activeUsersToday,
        activeUsersThisMonth,
        appointmentsToday,
        appointmentsThisMonth,
        prescriptionsToday,
        prescriptionsThisMonth,
      ] = await Promise.all([
        readClient.appointment.groupBy({
          by: ['doctorId'],
          where: { createdAt: { gte: oneDayAgo } },
        }),
        readClient.appointment.groupBy({
          by: ['doctorId'],
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        readClient.appointment.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        readClient.appointment.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        readClient.prescription.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        readClient.prescription.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

      const result = {
        dau: activeUsersToday.length,
        mau: activeUsersThisMonth.length,
        appointmentsToday,
        appointmentsThisMonth,
        prescriptionsToday,
        prescriptionsThisMonth,
      };

      await this.cacheManager.set(cacheKey, result, 300 * 1000);
      return result;
    } catch (_error) {
      throw new InternalServerErrorException('Failed to fetch usage metrics');
    }
  }

  async getTierDistribution() {
    try {
      const cacheKey = 'internal:tier-distribution';
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
      const readClient = this.getReadClient();

      const clinics = await readClient.clinic.groupBy({
        by: ['tier'],
        _count: { tier: true },
        orderBy: { tier: 'asc' },
      });

      const result = clinics.map((c) => ({
        tier: c.tier,
        count: c._count.tier,
      }));

      await this.cacheManager.set(cacheKey, result, 300 * 1000);
      return result;
    } catch (_error) {
      throw new InternalServerErrorException(
        'Failed to fetch tier distribution',
      );
    }
  }
}
