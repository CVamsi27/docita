import { Injectable, Inject } from '@nestjs/common';
import { DataSubjectRequestStatus } from '@workspace/db';
import type {
  AppComplianceSummary,
  CreateDataSubjectRequest,
  UpdateDataSubjectRequest,
} from '@workspace/types';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  CLINIC_PERSISTENCE_PORT,
  type ClinicPersistencePort,
} from '@/domains/clinics/application/ports/clinic-persistence.port';
import { ClinicDataService } from './clinic-data.service';
import { ClinicSettingsQueryService } from './clinic-settings-query.service';
import { ClinicSettingsCommandService } from './clinic-settings-command.service';
import type { ClinicSettingsData } from './clinic-settings.types';

/**
 * Facade that preserves the original ClinicSettingsService constructor
 * signature and public API while delegating to the query/command services.
 */
@Injectable()
export class ClinicSettingsService {
  constructor(
    @Inject(CLINIC_PERSISTENCE_PORT)
    private persistence: ClinicPersistencePort,
    private settingsFactory: SettingsFactory,
    private auditService: AuditService,
    private clinicDataService: ClinicDataService,
    private queryService: ClinicSettingsQueryService,
    private commandService: ClinicSettingsCommandService,
  ) {}

  updateSettings(id: string, data: ClinicSettingsData) {
    return this.commandService.updateSettings(id, data);
  }

  getComplianceSummary(clinicId: string): Promise<AppComplianceSummary> {
    return this.queryService.getComplianceSummary(clinicId);
  }

  listDataSubjectRequests(clinicId: string, status?: DataSubjectRequestStatus) {
    return this.queryService.listDataSubjectRequests(clinicId, status);
  }

  createDataSubjectRequest(
    clinicId: string,
    input: CreateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.commandService.createDataSubjectRequest(
      clinicId,
      input,
      actorUserId,
      ipAddress,
    );
  }

  updateDataSubjectRequest(
    clinicId: string,
    requestId: string,
    input: UpdateDataSubjectRequest,
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.commandService.updateDataSubjectRequest(
      clinicId,
      requestId,
      input,
      actorUserId,
      ipAddress,
    );
  }

  getPrescriptionDefaults(clinicId: string) {
    return this.queryService.getPrescriptionDefaults(clinicId);
  }

  updatePrescriptionDefaults(clinicId: string, data: Record<string, unknown>) {
    return this.commandService.updatePrescriptionDefaults(clinicId, data);
  }

  getOpdSlipSettings(clinicId: string) {
    return this.queryService.getOpdSlipSettings(clinicId);
  }

  updateOpdSlipSettings(
    clinicId: string,
    data: { revisitValidityDays?: number; footerNote?: string },
  ) {
    return this.commandService.updateOpdSlipSettings(clinicId, data);
  }
}
