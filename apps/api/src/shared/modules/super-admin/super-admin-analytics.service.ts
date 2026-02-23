import {
  Injectable,
  InternalServerErrorException,
  Inject,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import { getMonthRange, DEFAULT_TIMEZONE } from '@workspace/utils';

@Injectable()
export class SuperAdminAnalyticsService {
  private readonly logger = new Logger(SuperAdminAnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getGlobalStats(timezone: string = DEFAULT_TIMEZONE) {
    try {
      const cacheKey = `super-admin:global-stats:${timezone}`;
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) return cached;

      const thisMonthRange = getMonthRange(new Date(), { timezone });
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthRange = getMonthRange(lastMonthDate, { timezone });

      const [clinics, users, doctors, patients, invoices, prescriptions] =
        await Promise.all([
          this.prisma.clinic.count(),
          this.prisma.user.count(),
          this.prisma.user.count({ where: { role: 'DOCTOR' } }),
          this.prisma.patient.count(),
          this.prisma.invoice.count(),
          this.prisma.prescription.count(),
        ]);

      const [
        clinicsThisMonth,
        usersThisMonth,
        doctorsThisMonth,
        patientsThisMonth,
        invoicesThisMonth,
        prescriptionsThisMonth,
      ] = await Promise.all([
        this.prisma.clinic.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.user.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.user.count({
          where: {
            role: 'DOCTOR',
            createdAt: { gte: thisMonthRange.start },
          },
        }),
        this.prisma.patient.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.invoice.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
        this.prisma.prescription.count({
          where: { createdAt: { gte: thisMonthRange.start } },
        }),
      ]);

      const [invoicesLastMonth, prescriptionsLastMonth] = await Promise.all([
        this.prisma.invoice.count({
          where: {
            createdAt: { gte: lastMonthRange.start, lte: lastMonthRange.end },
          },
        }),
        this.prisma.prescription.count({
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
    } catch (error) {
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

      const [totalRevenue, appointmentsCount, newPatientsCount, invoices] =
        await Promise.all([
          this.prisma.invoice.aggregate({
            where: {
              createdAt: { gte: start, lte: end },
              status: InvoiceStatus.PAID,
            },
            _sum: { total: true },
          }),
          this.prisma.appointment.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
          this.prisma.patient.count({
            where: { createdAt: { gte: start, lte: end } },
          }),
          this.prisma.invoice.findMany({
            where: {
              createdAt: { gte: start, lte: end },
              status: InvoiceStatus.PAID,
            },
            select: { total: true },
          }),
        ]);

      const revenue = totalRevenue._sum?.total || 0;
      const avgInvoiceValue =
        invoices.length > 0
          ? invoices.reduce((sum, inv) => sum + (inv.total || 0), 0) /
            invoices.length
          : 0;

      const periodLength = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - periodLength);
      const prevEnd = new Date(end.getTime() - periodLength);

      const [prevRevenue, prevAppointments, prevPatients] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            createdAt: { gte: prevStart, lte: prevEnd },
            status: 'PAID',
          },
          _sum: { total: true },
        }),
        this.prisma.appointment.count({
          where: { createdAt: { gte: prevStart, lte: prevEnd } },
        }),
        this.prisma.patient.count({
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

      return {
        revenue: Number(revenue),
        appointments: appointmentsCount,
        newPatients: newPatientsCount,
        avgInvoiceValue: Number(avgInvoiceValue),
        revenueChange: Number(revenueChange.toFixed(2)),
        appointmentsChange: Number(appointmentsChange.toFixed(2)),
        patientsChange: Number(patientsChange.toFixed(2)),
      };
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

      const [
        recentAppointments,
        totalAppointmentsToday,
        failedPayments,
        totalPayments,
        activeClinicCount,
        totalClinicCount,
      ] = await Promise.all([
        this.prisma.appointment.count({
          where: { createdAt: { gte: oneHourAgo } },
        }),
        this.prisma.appointment.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        this.prisma.paymentSession.count({
          where: {
            status: PaymentSessionStatus.FAILED,
            createdAt: { gte: oneDayAgo },
          },
        }),
        this.prisma.paymentSession.count({
          where: { createdAt: { gte: oneDayAgo } },
        }),
        this.prisma.clinic.count({ where: { active: true } }),
        this.prisma.clinic.count(),
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
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to fetch performance metrics',
      );
    }
  }
}
