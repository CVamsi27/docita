import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

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

    // Cache key for this clinic's dashboard stats
    const cacheKey = `dashboard:stats:${clinicId}`;

    // Try to get cached data (60 second TTL)
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate 30 days ago for new patients this month
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const clinicFilter = { clinicId };
    const patientClinicFilter = { patient: { clinicId } };

    const [
      totalPatients,
      totalDoctors,
      newPatientsThisMonth,
      todayAppointments,
      totalAppointments,
      activePrescriptions,
      recentActivity,
    ] = await Promise.all([
      this.prisma.patient.count({ where: clinicFilter }),
      this.prisma.user.count({
        where: {
          clinicId,
          role: { in: ['DOCTOR', 'ADMIN'] },
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
      this.prisma.prescription.count({ where: patientClinicFilter }),
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
    ]);

    const upcomingAppointments = await this.prisma.appointment.findMany({
      where: {
        ...clinicFilter,
        startTime: {
          gte: today,
        },
        status: {
          in: ['scheduled', 'confirmed'],
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
      activePrescriptions,
      pendingReports: 0, // Placeholder
    };

    // Cache the result for 60 seconds
    await this.cacheManager.set(cacheKey, result, 60 * 1000);

    return result;
  }
  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - new Date(date).getTime()) / 1000,
    );

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }
}
