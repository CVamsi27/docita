import { Inject, Injectable } from '@nestjs/common';
import { PatientMetricsService } from '@/domains/patients/application/services/patientMetrics.service';
import {
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';

/**
 * Facade — delegates patient metrics reads/writes to PatientMetricsService under portal scope.
 */
@Injectable()
export class PatientPortalMetricsService {
  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly patientPortalRepository: IPatientPortalRepository,
    private readonly patientMetricsService: PatientMetricsService,
  ) {}

  async listCategories(clinicId: string, patientId: string) {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.patientPortalRepository.runUnrestricted(async () =>
      this.patientMetricsService.listCategories(clinicId, patientId),
    );
  }

  async getHistory(
    clinicId: string,
    patientId: string,
    query: MetricHistoryQueryDto,
  ) {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.patientPortalRepository.runUnrestricted(async () =>
      this.patientMetricsService.getHistory(clinicId, patientId, query),
    );
  }

  async getSelections(clinicId: string, patientId: string) {
    return this.patientPortalRepository.runUnrestricted(async () =>
      this.patientMetricsService.getSelections(clinicId, patientId),
    );
  }

  async upsertSelections(
    clinicId: string,
    patientId: string,
    dto: UpsertMetricSelectionsDto,
  ) {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.patientPortalRepository.runUnrestricted(async () =>
      this.patientMetricsService.upsertSelections(clinicId, patientId, dto),
    );
  }

  async recordMetricValue(
    clinicId: string,
    patientId: string,
    userId: string | undefined,
    dto: CreatePatientMetricValueDto,
  ) {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.patientPortalRepository.runUnrestricted(async () =>
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
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.patientPortalRepository.runUnrestricted(async () =>
      this.patientMetricsService.createDefinition(clinicId, patientId, dto),
    );
  }
}
