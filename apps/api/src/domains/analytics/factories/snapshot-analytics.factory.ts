import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../../prisma/prisma.service';
import { FinancialAnalyticsFactory } from './financial-analytics.factory';
import { OperationalAnalyticsFactory } from './operational-analytics.factory';
import { ClinicalAnalyticsFactory } from './clinical-analytics.factory';

export interface SnapshotRecord {
  [key: string]: any;
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

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private financialFactory: FinancialAnalyticsFactory,
    private operationalFactory: OperationalAnalyticsFactory,
    private clinicalFactory: ClinicalAnalyticsFactory,
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
          snapshotDate: new Date(),
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
          topConditions: (topConditions || []) as any,
        },
      });

      this.logger.log(
        `Analytics snapshot created for clinic ${clinicId}: ID ${snapshot.id}`,
      );

      await this.cacheManager.set(
        `snapshot-${clinicId}-${new Date().toISOString().split('T')[0]}`,
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
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const snapshots = await this.prisma.analyticsSnapshot.findMany({
        where: {
          clinicId,
          snapshotDate: { gte: startDate },
        },
        orderBy: { snapshotDate: 'desc' },
        take: days,
      });

      return snapshots.map((s) => ({
        ...s,
        totalRevenue: Number(s.totalRevenue),
        avgInvoiceAmount: Number(s.avgInvoiceAmount),
        appointmentFillRate: Number(s.appointmentFillRate),
        appointmentRate: Number(s.appointmentRate),
        topConditions: Array.isArray(s.topConditions) ? s.topConditions : [],
      })) as unknown as SnapshotRecord[];
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
