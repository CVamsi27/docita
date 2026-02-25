import { Injectable, Logger } from '@nestjs/common';
import { FinancialAnalyticsFactory } from '../../factories/financial-analytics.factory';
import { ClinicalAnalyticsFactory } from '../../factories/clinical-analytics.factory';
import { OperationalAnalyticsFactory } from '../../factories/operational-analytics.factory';
import {
  SnapshotAnalyticsFactory,
  SnapshotRecord,
} from '../../factories/snapshot-analytics.factory';
import { DEFAULT_TIMEZONE } from '@workspace/utils';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private financialFactory: FinancialAnalyticsFactory,
    private clinicalFactory: ClinicalAnalyticsFactory,
    private operationalFactory: OperationalAnalyticsFactory,
    private snapshotFactory: SnapshotAnalyticsFactory,
  ) {}

  async getOverview(clinicId: string, timezone: string = DEFAULT_TIMEZONE) {
    return this.operationalFactory.getOverview(clinicId, timezone);
  }

  async getPatientGrowth(
    clinicId: string,
    days: number = 30,
    timezone: string = DEFAULT_TIMEZONE,
  ) {
    return this.operationalFactory.getPatientGrowth(clinicId, days, timezone);
  }

  async getAppointmentStats(
    clinicId: string,
    timezone: string = DEFAULT_TIMEZONE,
  ) {
    return this.operationalFactory.getAppointmentStats(clinicId, timezone);
  }

  async getAppointmentMetrics(
    clinicId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.operationalFactory.getAppointmentMetrics(
      clinicId,
      period,
      startDate,
      endDate,
    );
  }

  async getPatientDemographics(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.operationalFactory.getPatientDemographics(
      clinicId,
      startDate,
      endDate,
    );
  }

  async getUncodedVisitsStats(clinicId: string) {
    return this.operationalFactory.getUncodedVisitsStats(clinicId);
  }

  async getRevenueTrends(
    clinicId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30,
    timezone: string = DEFAULT_TIMEZONE,
  ) {
    return this.financialFactory.getRevenueTrends(
      clinicId,
      period,
      days,
      timezone,
    );
  }

  async getRevenueByCptCode(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.financialFactory.getRevenueByCptCode(
      clinicId,
      startDate,
      endDate,
    );
  }

  async getRevenueByCategory(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.financialFactory.getRevenueByCategory(
      clinicId,
      startDate,
      endDate,
    );
  }

  async getRevenueTimeSeries(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    return this.financialFactory.getRevenueTimeSeries(
      clinicId,
      startDate,
      endDate,
      groupBy,
    );
  }

  async getRevenueMetrics(
    clinicId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.financialFactory.getRevenueMetrics(
      clinicId,
      period,
      startDate,
      endDate,
    );
  }

  async getTopDiagnoses(clinicId: string, limit: number = 10) {
    return this.clinicalFactory.getTopDiagnoses(clinicId, limit);
  }

  async getDiseaseTrends(clinicId: string, startDate?: Date, endDate?: Date) {
    return this.clinicalFactory.getDiseaseTrends(clinicId, startDate, endDate);
  }

  async getDiseaseTrendsByCategory(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.clinicalFactory.getDiseaseTrendsByCategory(
      clinicId,
      startDate,
      endDate,
    );
  }

  async getDiseaseTimeSeries(
    clinicId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'month',
  ) {
    return this.clinicalFactory.getDiseaseTimeSeries(
      clinicId,
      startDate,
      endDate,
      groupBy,
    );
  }

  async getCodingComplianceMetrics(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.clinicalFactory.getCodingComplianceMetrics(
      clinicId,
      startDate,
      endDate,
    );
  }

  async getCodingTimeliness(
    clinicId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.clinicalFactory.getCodingTimeliness(
      clinicId,
      startDate,
      endDate,
    );
  }

  async getTopConditions(clinicId: string, limit: number = 10) {
    return this.clinicalFactory.getTopConditions(clinicId, limit);
  }

  async createAnalyticsSnapshot(clinicId: string): Promise<void> {
    return this.snapshotFactory.createAnalyticsSnapshot(clinicId);
  }

  async getAnalyticsSnapshots(
    clinicId: string,
    days: number = 30,
  ): Promise<SnapshotRecord[]> {
    return this.snapshotFactory.getAnalyticsSnapshots(clinicId, days);
  }

  async getSnapshotTrends(
    clinicId: string,
    days: number = 30,
  ): Promise<Record<string, unknown> | null> {
    return this.snapshotFactory.getSnapshotTrends(clinicId, days);
  }
}
