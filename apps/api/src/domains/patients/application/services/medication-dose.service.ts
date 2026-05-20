import { Injectable } from '@nestjs/common';
import { MedicationDoseSource, MedicationDoseStatus } from '@workspace/db';
import { MedicationDoseCommandService } from './medication-dose-command.service';
import { MedicationDoseQueryService } from './medication-dose-query.service';

/**
 * Facade — delegates medication dose reads and mutations to query/command services.
 */
@Injectable()
export class MedicationDoseService {
  constructor(
    private readonly queryService: MedicationDoseQueryService,
    private readonly commandService: MedicationDoseCommandService,
  ) {}

  recordDose(
    clinicId: string,
    patientId: string,
    dto: Parameters<MedicationDoseCommandService['recordDose']>[2],
  ) {
    return this.commandService.recordDose(clinicId, patientId, dto);
  }

  recordAdHocDose(
    clinicId: string,
    patientId: string,
    dto: Parameters<MedicationDoseCommandService['recordAdHocDose']>[2],
    source?: MedicationDoseSource,
  ) {
    return this.commandService.recordAdHocDose(
      clinicId,
      patientId,
      dto,
      source,
    );
  }

  updateDoseStatus(
    clinicId: string,
    patientId: string,
    doseId: string,
    dto: Parameters<MedicationDoseCommandService['updateDoseStatus']>[3],
  ) {
    return this.commandService.updateDoseStatus(
      clinicId,
      patientId,
      doseId,
      dto,
    );
  }

  getDoseHistory(
    clinicId: string,
    patientId: string,
    query: Parameters<MedicationDoseQueryService['getDoseHistory']>[2],
  ) {
    return this.queryService.getDoseHistory(clinicId, patientId, query);
  }

  getAdherenceSummary(
    clinicId: string,
    patientId: string,
    prescriptionId?: string,
  ) {
    return this.queryService.getAdherenceSummary(
      clinicId,
      patientId,
      prescriptionId,
    );
  }

  getActiveMedications(clinicId: string, patientId: string) {
    return this.queryService.getActiveMedications(clinicId, patientId);
  }

  generateScheduledDoses(
    clinicId: string,
    patientId: string,
    prescriptionId: string,
  ) {
    return this.commandService.generateScheduledDoses(
      clinicId,
      patientId,
      prescriptionId,
    );
  }
}
