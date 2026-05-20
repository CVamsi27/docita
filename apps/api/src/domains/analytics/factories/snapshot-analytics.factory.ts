import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@workspace/db';
import { FinancialAnalyticsFactory } from './financial-analytics.factory';
import { OperationalAnalyticsFactory } from './operational-analytics.factory';
import { ClinicalAnalyticsFactory } from './clinical-analytics.factory';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

export interface SnapshotRecord {
  [key: string]: unknown;
  id: string;
  clinicId: string;
  snapshotDate: Date;
  period: string;
  totalRevenue: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
  totalAppointments: number;
  completedAppts: number;
  cancelledAppts: number;
  appointmentFillRate: number;
  newPatients: number;
  activePatients: number;
  appointmentRate: number;
  topConditions: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SnapshotAnalyticsFactory {
  private readonly logger = new Logger(SnapshotAnalyticsFactory.name);

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private financialFactory: FinancialAnalyticsFactory,
    private operationalFactory: OperationalAnalyticsFactory,
    private clinicalFactory: ClinicalAnalyticsFactory,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async createAnalyticsSnapshot(clinicId: string): Promise<void> {
    try {
      this.logger.log(`Creating analytics snapshot for clinic ${clinicId}`);

      const revenue = await this.financialFactory.getRevenueMetrics(
        clinicId,
        'daily',
      );
      const appointments = await this.operationalFactory.getAppointmentMetrics(
        clinicId,
        'daily',
      );
      const demographics =
        await this.operationalFactory.getPatientDemographics(clinicId);
      const topConditions = await this.clinicalFactory.getTopConditions(
        clinicId,
        10,
      );

      const totalRevenue = revenue.reduce((sum, r) => sum + r.totalRevenue, 0);
      const totalAppointments = appointments.total || 0;
      const completedAppointments = appointments.completed || 0;

      const snapshot = await this.prisma.analyticsSnapshot.create({
        data: {
          clinicId,
          snapshotDate: this.clock.now(),
          period: 'daily',
          totalRevenue,
          invoiceCount: revenue.length,
          avgInvoiceAmount:
            revenue.length > 0
              ? revenue.reduce((sum, r) => sum + r.totalRevenue, 0) /
                revenue.length
              : 0,
          totalAppointments,
          completedAppts: completedAppointments,
          cancelledAppts: appointments.cancelled || 0,
          appointmentFillRate: appointments.fillRate || 0,
          newPatients: demographics.newPatients || 0,
          activePatients: demographics.totalPatients || 0,
          appointmentRate: appointments.fillRate || 0,
          topConditions: this.toJsonValue(topConditions || []),
        },
      });

      this.logger.log(
        `Analytics snapshot created for clinic ${clinicId}: ID ${snapshot.id}`,
      );

      await this.cacheManager.set(
        `snapshot-${clinicId}-${this.clock.now().toISOString().split('T')[0]}`,
        snapshot,
        86400000,
      );
    } catch (error) {
      this.logger.error('Error creating analytics snapshot', error);
    }
  }

  async getAnalyticsSnapshots(
    clinicId: string,
    days: number = 30,
  ): Promise<SnapshotRecord[]> {
    try {
      const startDate = this.clock.now();
      startDate.setDate(startDate.getDate() - days);

      const snapshots = await this.prisma.analyticsSnapshot.findMany({
        where: {
          clinicId,
          snapshotDate: { gte: startDate },
        },
        orderBy: { snapshotDate: 'desc' },
        take: days,
      });

      const normalizedSnapshots: SnapshotRecord[] = snapshots.map((s) => ({
        ...s,
        totalRevenue: Number(s.totalRevenue),
        avgInvoiceAmount: Number(s.avgInvoiceAmount),
        appointmentFillRate: Number(s.appointmentFillRate),
        appointmentRate: Number(s.appointmentRate),
        topConditions: Array.isArray(s.topConditions) ? s.topConditions : [],
        updatedAt: s.createdAt,
      }));

      return normalizedSnapshots;
    } catch (error) {
      this.logger.error('Error retrieving analytics snapshots', error);
      return [];
    }
  }

  async getSnapshotTrends(
    clinicId: string,
    days: number = 30,
  ): Promise<Record<string, unknown> | null> {
    try {
      const snapshots = await this.getAnalyticsSnapshots(clinicId, days);

      if (snapshots.length === 0) {
        return null;
      }

      const latestSnapshot = snapshots[0];
      const oldestSnapshot = snapshots[snapshots.length - 1];

      return {
        currentMetrics: {
          totalRevenue: latestSnapshot.totalRevenue,
          totalAppointments: latestSnapshot.totalAppointments,
          totalPatients: latestSnapshot.activePatients,
          codingCompletenessRate: latestSnapshot.appointmentRate,
          billingRate: latestSnapshot.appointmentFillRate,
        },
        trendComparison: {
          revenueChange:
            latestSnapshot.totalRevenue - oldestSnapshot.totalRevenue,
          appointmentChange:
            latestSnapshot.totalAppointments - oldestSnapshot.totalAppointments,
          patientChange:
            latestSnapshot.activePatients - oldestSnapshot.activePatients,
          codingCompletenessTrend:
            latestSnapshot.appointmentRate - oldestSnapshot.appointmentRate,
        },
        snapshotCount: snapshots.length,
        dateRange: {
          start: oldestSnapshot.snapshotDate,
          end: latestSnapshot.snapshotDate,
        },
        snapshots: snapshots.slice(0, 10),
      };
    } catch (error) {
      this.logger.error('Error retrieving snapshot trends', error);
      return null;
    }
  }
}
