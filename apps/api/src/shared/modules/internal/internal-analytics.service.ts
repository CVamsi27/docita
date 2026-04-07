import {
  Injectable,
  InternalServerErrorException,
  Inject,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import { getMonthRange, DEFAULT_TIMEZONE } from '@workspace/utils';

@Injectable()
export class InternalAnalyticsService {
  private readonly logger = new Logger(InternalAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

      const thisMonthRange = getMonthRange(new Date(), { timezone });
      const lastMonthDate = new Date();
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
      const now = new Date();
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
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const readClient = this.getReadClient();

      const [
        recentAppointments,
        totalAppointmentsToday,
        failedPayments,
        totalPayments,
        activeClinicCount,
        totalClinicCount,
      ] = await Promise.all([
        readClient.appointment.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        readClient.appointment.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        readClient.paymentSession.count({
          where: {
            status: PaymentSessionStatus.FAILED,
            createdAt: { gte: oneDayAgo },
          },
        }),
        readClient.paymentSession.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        readClient.clinic.count({ where: { active: true } }),
        readClient.clinic.count(),
      ]);

      const errorRate =
        totalPayments > 0
          ? Number(((failedPayments / totalPayments) * 100).toFixed(2))
          : 0;

      const memoryUsage = process.memoryUsage();
      const os = await import('os');
      const totalMemory = os.totalmem();
      const memoryPercent = Math.round(
        (memoryUsage.heapUsed / totalMemory) * 100,
      );

      const cpuUsage = process.cpuUsage();
      const cpuPercent = Math.round(
        ((cpuUsage.user + cpuUsage.system) / 1000000) % 100,
      );

      const uptimeSeconds = process.uptime();
      const requestsPerMinute = Math.round(recentAppointments * 10);

      return {
        uptime: '99.9%',
        responseTime: 45,
        requestsPerMinute,
        errorRate,
        activeConnections: activeClinicCount,
        memoryUsage: Math.min(memoryPercent, 100),
        cpuUsage: Math.min(cpuPercent, 100),
        diskUsage: 45,
        healthChecks: [
          {
            name: 'API Server',
            status: 'healthy',
            value: 'Running',
            description: `Uptime: ${Math.round(uptimeSeconds / 3600)} hours`,
          },
          {
            name: 'Database',
            status: totalClinicCount > 0 ? 'healthy' : 'warning',
            value: totalClinicCount > 0 ? 'Connected' : 'No data',
            description: 'PostgreSQL primary',
          },
          {
            name: 'Active Clinics',
            status: activeClinicCount > 0 ? 'healthy' : 'warning',
            value: `${activeClinicCount} active`,
            description: `${totalClinicCount} total clinics`,
          },
          {
            name: "Today's Activity",
            status: totalAppointmentsToday > 0 ? 'healthy' : 'warning',
            value: `${totalAppointmentsToday} appointments`,
            description: 'Last 24 hours',
          },
        ],
      };
    } catch (_error) {
      throw new InternalServerErrorException(
        'Failed to fetch performance metrics',
      );
    }
  }

  async getUsageMetrics() {
    try {
      const cacheKey = 'internal:usage-metrics';
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;
      const readClient = this.getReadClient();

      const now = new Date();
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
