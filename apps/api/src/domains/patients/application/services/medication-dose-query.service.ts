import { Injectable, Inject } from '@nestjs/common';
import { MedicationDoseStatus, Prisma } from '@workspace/db';
import {
  IMedicationDoseRepository,
  MEDICATION_DOSE_REPOSITORY_TOKEN,
} from '@/domains/patients/core/repositories/medication-dose.repository.interface';
import { verifyMedicationDosePatientAccess } from './medication-dose-access.helpers';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

interface DoseHistoryQuery {
  prescriptionId?: string;
  from?: string;
  to?: string;
  status?: MedicationDoseStatus;
  limit?: number;
  offset?: number;
}

@Injectable()
export class MedicationDoseQueryService {
  constructor(
    @Inject(MEDICATION_DOSE_REPOSITORY_TOKEN)
    private readonly repository: IMedicationDoseRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getDoseHistory(
    clinicId: string,
    patientId: string,
    query: DoseHistoryQuery,
  ) {
    await verifyMedicationDosePatientAccess(
      this.repository,
      clinicId,
      patientId,
    );

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
    await verifyMedicationDosePatientAccess(
      this.repository,
      clinicId,
      patientId,
    );

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
    await verifyMedicationDosePatientAccess(
      this.repository,
      clinicId,
      patientId,
    );

    const now = this.clock.now();

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
}
