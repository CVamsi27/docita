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
import {
  parseDosesPerDay,
  parseDurationDays,
} from '@/domains/patients/core/domain-services/medication-dose.rules';
import {
  buildScheduledDoses,
  chunkDoseDrafts,
  DOSE_INSERT_BATCH_SIZE,
} from '@/domains/patients/core/domain-services/medication-dose-schedule.rules';
import { verifyMedicationDosePatientAccess } from './medication-dose-access.helpers';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

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
  version?: number;
}

@Injectable()
export class MedicationDoseCommandService {
  private readonly logger = new Logger(MedicationDoseCommandService.name);

  constructor(
    @Inject(MEDICATION_DOSE_REPOSITORY_TOKEN)
    private readonly repository: IMedicationDoseRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private async verifyMedicationAccess(
    clinicId: string,
    patientId: string,
    medicationId: string,
  ) {
    await verifyMedicationDosePatientAccess(
      this.repository,
      clinicId,
      patientId,
    );

    const medication =
      await this.repository.findMedicationWithPrescription(medicationId);

    if (!medication || medication.prescription.patientId !== patientId)
      throw new NotFoundException('Medication not found for this patient');

    return medication;
  }

  async recordDose(clinicId: string, patientId: string, dto: RecordDoseDto) {
    const medication = await this.verifyMedicationAccess(
      clinicId,
      patientId,
      dto.medicationId,
    );

    return this.repository.createDose({
      medicationId: dto.medicationId,
      patientId,
      clinicId,
      prescriptionId: dto.prescriptionId ?? medication.prescriptionId,
      scheduledAt: dto.scheduledAt,
      status: dto.status ?? 'PENDING',
      doseAmount: dto.doseAmount,
      notes: dto.notes,
      source: 'CLINICIAN_RECORDED' satisfies MedicationDoseSource,
    });
  }

  async recordAdHocDose(
    clinicId: string,
    patientId: string,
    dto: RecordAdHocDoseDto,
    source: MedicationDoseSource = 'PATIENT_REPORTED',
  ) {
    const medication = await this.verifyMedicationAccess(
      clinicId,
      patientId,
      dto.medicationId,
    );

    if (!medication.isPRN)
      throw new BadRequestException(
        'Ad-hoc dose recording is only available for PRN (as-needed) medications',
      );

    if (medication.prnMaxDose && dto.doseAmount) {
      this.logger.log(
        `PRN max dose check: patient ${patientId} recording ad-hoc dose for ${medication.name}`,
      );
    }

    const takenAt = dto.takenAt ?? this.clock.now();

    return this.repository.createDose({
      medicationId: dto.medicationId,
      patientId,
      clinicId,
      prescriptionId: dto.prescriptionId ?? medication.prescriptionId,
      scheduledAt: takenAt,
      takenAt,
      status: 'TAKEN' satisfies MedicationDoseStatus,
      doseAmount: dto.doseAmount,
      notes: dto.notes,
      source,
    });
  }

  async updateDoseStatus(
    clinicId: string,
    patientId: string,
    doseId: string,
    dto: UpdateDoseStatusDto,
  ) {
    const dose = await this.repository.findDoseById(
      doseId,
      patientId,
      clinicId,
    );

    if (!dose) throw new NotFoundException('Medication dose not found');

    if (dto.version !== undefined && dose.version !== dto.version)
      throw new BadRequestException(
        'Medication dose has changed. Refresh and try again.',
      );

    const data: Prisma.MedicationDoseUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.takenAt !== undefined) data.takenAt = dto.takenAt;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.status === 'TAKEN' && !dto.takenAt && !dose.takenAt) {
      data.takenAt = this.clock.now();
    }

    return this.repository.updateDose(doseId, data);
  }

  async generateScheduledDoses(
    clinicId: string,
    patientId: string,
    prescriptionId: string,
  ) {
    const prescription = await this.repository.findPrescriptionById(
      prescriptionId,
      patientId,
    );

    if (!prescription) throw new NotFoundException('Prescription not found');
    const created: string[] = [];
    const truncatedMedicationIds: string[] = [];
    for (const med of prescription.medications) {
      if (med.isPRN) continue;

      const dosesPerDay = parseDosesPerDay(med.sigCode, med.frequency);
      if (!dosesPerDay) continue;

      const durationDays = parseDurationDays(med.duration);
      if (!durationDays) continue;

      const startDate = med.startDate ?? prescription.date;
      const { doses, truncated } = buildScheduledDoses({
        startDate,
        durationDays,
        dosesPerDay,
        medicationId: med.id,
        patientId,
        clinicId,
        prescriptionId,
      });

      if (doses.length === 0) continue;

      for (const batch of chunkDoseDrafts(doses, DOSE_INSERT_BATCH_SIZE)) {
        await this.repository.createManyDoses(batch);
      }

      created.push(med.id);
      if (truncated) truncatedMedicationIds.push(med.id);
    }
    return { medicationsProcessed: created.length, truncatedMedicationIds };
  }
}
