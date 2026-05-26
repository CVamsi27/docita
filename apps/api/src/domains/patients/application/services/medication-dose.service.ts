import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import {
  MedicationDoseSource,
  MedicationDoseStatus,
  Prisma,
} from '@workspace/db';
import {
  IMedicationDoseRepository,
  MEDICATION_DOSE_REPOSITORY_TOKEN,
} from '@/domains/patients/core/repositories/medication-dose.repository.interface';
import { parseDosesPerDay, parseDurationDays } from './medication-dose-helpers';

interface RecordDoseDto {
  medicationId: string;
  scheduledAt: Date;
  status?: MedicationDoseStatus;
  doseAmount?: string;
  notes?: string;
  prescriptionId?: string;
}

interface RecordAdHocDoseDto {
  medicationId: string;
  takenAt?: Date;
  doseAmount?: string;
  notes?: string;
  prescriptionId?: string;
}

interface UpdateDoseStatusDto {
  takenAt?: Date;
  status?: MedicationDoseStatus;
  notes?: string;
}

interface DoseHistoryQuery {
  prescriptionId?: string;
  from?: string;
  to?: string;
  status?: MedicationDoseStatus;
  limit?: number;
  offset?: number;
}

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
    const prescription = await this.repository.findPrescriptionById(
      prescriptionId,
      patientId,
    );

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    const created: string[] = [];

    for (const med of prescription.medications) {
      if (med.isPRN) continue;

      const dosesPerDay = parseDosesPerDay(med.sigCode, med.frequency);
      if (!dosesPerDay) continue;

      const durationDays = parseDurationDays(med.duration);
      if (!durationDays) continue;

      const startDate = med.startDate ?? prescription.date;
      const doses: Array<{
        scheduledAt: Date;
        medicationId: string;
        patientId: string;
        clinicId: string;
        prescriptionId: string;
        status: MedicationDoseStatus;
        source: MedicationDoseSource;
      }> = [];

      const intervalHours = 24 / dosesPerDay;

      for (let day = 0; day < durationDays; day++) {
        for (let dose = 0; dose < dosesPerDay; dose++) {
          const scheduledAt = new Date(startDate);
          scheduledAt.setDate(scheduledAt.getDate() + day);
          scheduledAt.setHours(
            scheduledAt.getHours() + Math.round(dose * intervalHours),
          );
          doses.push({
            scheduledAt,
            medicationId: med.id,
            patientId,
            clinicId,
            prescriptionId,
            status: 'PENDING',
            source: 'SYSTEM_GENERATED',
          });
        }
      }

      if (doses.length > 0 && doses.length <= 500) {
        await this.repository.createManyDoses(doses);
        created.push(med.id);
      }
    }

    return { medicationsProcessed: created.length };
  }

  private async verifyPatientAccess(
    clinicId: string,
    patientId: string,
  ): Promise<void> {
    const found = await this.repository.verifyPatientAccess(
      patientId,
      clinicId,
      patientId,
      prescriptionId,
    );
  }
}
