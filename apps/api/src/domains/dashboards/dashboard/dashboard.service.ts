import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AppointmentStatus,
  LabTestOrderStatus,
  InvoiceStatus,
} from '@workspace/db';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getStats(clinicId: string) {
    if (!clinicId) {
      return {
        totalPatients: 0,
        todayAppointments: 0,
        totalAppointments: 0,
        activePrescriptions: 0,
        recentActivity: [],
        upcomingAppointments: [],
      };
    }

    const cacheKey = `dashboard:stats:${clinicId}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clinicFilter = { clinicId };

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    const [
      totalPatients,
      totalDoctors,
      newPatientsThisMonth,
      todayAppointments,
      totalAppointments,
      activePrescriptions,
      recentActivity,
      pendingReports,
      monthlyRevenueResult,
    ] = await Promise.all([
      this.prisma.patient.count({ where: clinicFilter }),
      this.prisma.user.count({
        where: {
          clinicId,
          role: { in: ['DOCTOR', 'ADMIN_DOCTOR'] },
        },
      }),
      this.prisma.patient.count({
        where: {
          ...clinicFilter,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.appointment.count({
        where: {
          ...clinicFilter,
          startTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      this.prisma.appointment.count({ where: clinicFilter }),
      this.prisma.prescription.count({
        where: { appointment: { clinicId } },
      }),
      this.prisma.appointment.findMany({
        where: clinicFilter,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          startTime: true,
          status: true,
          type: true,
          createdAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.labTestOrder.count({
        where: {
          clinicId,
          status: {
            in: [LabTestOrderStatus.ORDERED, LabTestOrderStatus.PENDING],
          },
        },
      }),
      this.prisma.invoice.aggregate({
        where: {
          appointment: { clinicId },
          status: InvoiceStatus.PAID,
          updatedAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        _sum: { total: true },
      }),
    ]);

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        ...clinicFilter,
        startTime: {
          gte: today,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
      },
      take: 4,
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const result = {
      totalPatients,
      totalDoctors,
      newPatientsThisMonth,
      todayAppointments,
      totalAppointments,
      activePrescriptions,
      recentActivity,
      upcomingAppointments,
      pendingReports,
      monthlyRevenue: monthlyRevenueResult._sum.total ?? 0,
    };

    await this.cacheManager.set(cacheKey, result, 60 * 1000);

    return result;
  }
}
