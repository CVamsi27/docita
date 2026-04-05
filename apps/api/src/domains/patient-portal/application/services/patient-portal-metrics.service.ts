import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PatientMetricsService } from '@/domains/patients/application/services/patientMetrics.service';
import {
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';

@Injectable()
export class PatientPortalMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientMetricsService: PatientMetricsService,
  ) {}

  async listCategories(clinicId: string, patientId: string) {
    return this.prisma.runUnrestricted(async () =>
      this.patientMetricsService.listCategories(clinicId, patientId),
    );
  }

  async getHistory(
    clinicId: string,
    patientId: string,
    query: MetricHistoryQueryDto,
  ) {
    return this.prisma.runUnrestricted(async () =>
      this.patientMetricsService.getHistory(clinicId, patientId, query),
    );
  }

  async getSelections(clinicId: string, patientId: string) {
    return this.prisma.runUnrestricted(async () =>
      this.patientMetricsService.getSelections(clinicId, patientId),
    );
  }

  async upsertSelections(
    clinicId: string,
    patientId: string,
    dto: UpsertMetricSelectionsDto,
  ) {
    return this.prisma.runUnrestricted(async () =>
      this.patientMetricsService.upsertSelections(clinicId, patientId, dto),
    );
  }

  async recordMetricValue(
    clinicId: string,
    patientId: string,
    userId: string | undefined,
    dto: CreatePatientMetricValueDto,
  ) {
    return this.prisma.runUnrestricted(async () =>
      this.patientMetricsService.recordMetricValue(
        clinicId,
        patientId,
        userId,
        {
          ...dto,
          source: 'PATIENT_PORTAL',
        },
      ),
    );
  }

  async createDefinition(
    clinicId: string,
    patientId: string,
    dto: CreateMetricDefinitionDto,
  ) {
    return this.prisma.runUnrestricted(async () =>
      this.patientMetricsService.createDefinition(clinicId, patientId, dto),
    );
  }
}
