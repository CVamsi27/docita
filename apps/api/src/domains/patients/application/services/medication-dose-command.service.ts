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
import { verifyMedicationDosePatientAccess } from './medication-dose-access.helpers';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

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

@Injectable()
export class MedicationDoseCommandService {
  private readonly logger = new Logger(MedicationDoseCommandService.name);

  constructor(
    @Inject(MEDICATION_DOSE_REPOSITORY_TOKEN)
    private readonly repository: IMedicationDoseRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async recordDose(clinicId: string, patientId: string, dto: RecordDoseDto) {
    await verifyMedicationDosePatientAccess(
      this.repository,
      clinicId,
      patientId,
    );

    const medication = await this.repository.findMedicationWithPrescription(
      dto.medicationId,
    );

    if (!medication || medication.prescription.patientId !== patientId) {
      throw new NotFoundException('Medication not found for this patient');
    }

    return this.repository.createDose({
      medicationId: dto.medicationId,
      patientId,
      clinicId,
      prescriptionId: dto.prescriptionId ?? medication.prescriptionId,
      scheduledAt: dto.scheduledAt,
      status: dto.status ?? 'PENDING',
      doseAmount: dto.doseAmount,
      notes: dto.notes,
      source: 'CLINICIAN_RECORDED' as MedicationDoseSource,
    });
  }

  async recordAdHocDose(
    clinicId: string,
    patientId: string,
    dto: RecordAdHocDoseDto,
    source: MedicationDoseSource = 'PATIENT_REPORTED',
  ) {
    await verifyMedicationDosePatientAccess(
      this.repository,
      clinicId,
      patientId,
    );

    const medication = await this.repository.findMedicationWithPrescription(
      dto.medicationId,
    );

    if (!medication || medication.prescription.patientId !== patientId) {
      throw new NotFoundException('Medication not found for this patient');
    }

    if (!medication.isPRN) {
      throw new BadRequestException(
        'Ad-hoc dose recording is only available for PRN (as-needed) medications',
      );
    }

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
      status: 'TAKEN' as MedicationDoseStatus,
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

    if (!dose) {
      throw new NotFoundException('Medication dose not found');
    }

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
}
