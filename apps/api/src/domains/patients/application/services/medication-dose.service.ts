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

@Injectable()
export class MedicationDoseService {
  private readonly logger = new Logger(MedicationDoseService.name);

  constructor(
    @Inject(MEDICATION_DOSE_REPOSITORY_TOKEN)
    private readonly repository: IMedicationDoseRepository,
  ) {}

  async recordDose(clinicId: string, patientId: string, dto: RecordDoseDto) {
    await this.verifyPatientAccess(clinicId, patientId);

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
    await this.verifyPatientAccess(clinicId, patientId);

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

    const takenAt = dto.takenAt ?? new Date();

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
      data.takenAt = new Date();
    }

    return this.repository.updateDose(doseId, data);
  }

  async getDoseHistory(
    clinicId: string,
    patientId: string,
    query: DoseHistoryQuery,
  ) {
    await this.verifyPatientAccess(clinicId, patientId);

    const where: Prisma.MedicationDoseWhereInput = { patientId, clinicId };
    if (query.prescriptionId) where.prescriptionId = query.prescriptionId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.scheduledAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [doses, total] = await Promise.all([
      this.repository.findDoses(where, { take: limit, skip: offset }),
      this.repository.countDoses(where),
    ]);

    return { doses, total, limit, offset };
  }

  async getAdherenceSummary(
    clinicId: string,
    patientId: string,
    prescriptionId?: string,
  ) {
    await this.verifyPatientAccess(clinicId, patientId);

    const where: Prisma.MedicationDoseWhereInput = {
      patientId,
      clinicId,
      source: {
        in: ['SYSTEM_GENERATED', 'PATIENT_REPORTED', 'CLINICIAN_RECORDED'],
      },
    };

    if (prescriptionId) where.prescriptionId = prescriptionId;

    const doses = await this.repository.groupDosesByStatus(where);

    const counts: Record<string, number> = {};
    for (const d of doses) {
      counts[d.status] = d._count.status;
    }

    const taken = counts['TAKEN'] ?? 0;
    const missed = counts['MISSED'] ?? 0;
    const skipped = counts['SKIPPED'] ?? 0;
    const pending = counts['PENDING'] ?? 0;
    const administered = counts['ADMINISTERED'] ?? 0;
    const totalDoses = taken + missed + skipped + pending + administered;
    const completed = taken + administered;
    const adherenceRate = totalDoses > 0 ? (completed / totalDoses) * 100 : 0;

    return { totalDoses, taken: completed, missed, skipped, adherenceRate };
  }

  async getActiveMedications(clinicId: string, patientId: string) {
    await this.verifyPatientAccess(clinicId, patientId);

    const now = new Date();

    const prescriptions =
      await this.repository.findPrescriptionsWithMedications(patientId, 10);

    const activeMedications: Array<{
      medicationId: string;
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      route: string;
      startDate: Date | null;
      endDate: Date | null;
      isPRN: boolean;
      prnInstructions: string | null;
      prescriptionId: string;
      prescriptionDate: Date;
      adherence: {
        totalDoses: number;
        taken: number;
        missed: number;
        skipped: number;
        adherenceRate: number;
      } | null;
    }> = [];

    for (const prescription of prescriptions) {
      for (const med of prescription.medications) {
        const isActive = !med.endDate || med.endDate >= now;

        if (!isActive) continue;

        let adherence = null;
        if (!med.isPRN) {
          const summary = await this.getAdherenceSummary(
            clinicId,
            patientId,
            prescription.id,
          );
          if (summary.totalDoses > 0) {
            adherence = summary;
          }
        }

        activeMedications.push({
          medicationId: med.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          route: med.route,
          startDate: med.startDate,
          endDate: med.endDate,
          isPRN: med.isPRN,
          prnInstructions: med.prnInstructions,
          prescriptionId: prescription.id,
          prescriptionDate: prescription.date,
          adherence,
        });
      }
    }

    return activeMedications;
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

  private async verifyPatientAccess(
    clinicId: string,
    patientId: string,
  ): Promise<void> {
    const found = await this.repository.verifyPatientAccess(
      patientId,
      clinicId,
    );
    if (!found) {
      throw new NotFoundException('Patient not found');
    }
  }
}
