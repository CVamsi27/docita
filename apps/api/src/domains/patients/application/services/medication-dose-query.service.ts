import { Injectable, Inject, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(MedicationDoseQueryService.name);

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

    const now = this.clock.now();
    const dueWhere: Prisma.MedicationDoseWhereInput = {
      ...where,
      scheduledAt: { lte: now },
    };

    const doses = await this.repository.groupDosesByStatus(dueWhere);

    const counts: Record<string, number> = {};
    for (const d of doses) {
      counts[d.status] = d._count.status;
    }

    const taken = counts['TAKEN'] ?? 0;
    const missed = counts['MISSED'] ?? 0;
    const skipped = counts['SKIPPED'] ?? 0;
    const pending = counts['PENDING'] ?? 0;
    const administered = counts['ADMINISTERED'] ?? 0;
    const dueDoses = taken + missed + skipped + pending + administered;
    const completed = taken + administered;
    const adherenceRate = dueDoses > 0 ? (completed / dueDoses) * 100 : 100;

    return {
      totalDoses: dueDoses,
      taken: completed,
      missed,
      skipped,
      adherenceRate,
    };
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

    // Batched adherence: one groupBy for every non-PrN medication on
    // the active-prescription list, not one per medication. Was
    // ~50 sequential round-trips before.
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
    const medicationIdsForAdherence: string[] = [];

    for (const prescription of prescriptions) {
      for (const med of prescription.medications) {
        const isActive = !med.endDate || med.endDate >= now;

        if (!isActive) continue;

        if (!med.isPRN) {
          medicationIdsForAdherence.push(med.id);
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
          adherence: null,
        });
      }
    }

    const adherenceByMedicationId = new Map<
      string,
      {
        totalDoses: number;
        taken: number;
        missed: number;
        skipped: number;
        adherenceRate: number;
      }
    >();

    if (medicationIdsForAdherence.length > 0) {
      try {
        const uniqueMedicationIds = [...new Set(medicationIdsForAdherence)];
        const dueWhere: Prisma.MedicationDoseWhereInput = {
          clinicId,
          patientId,
          medicationId: { in: uniqueMedicationIds },
          scheduledAt: { lte: now },
          source: {
            in: ['SYSTEM_GENERATED', 'PATIENT_REPORTED', 'CLINICIAN_RECORDED'],
          },
        };
        const rows =
          await this.repository.groupDosesByMedicationAndStatus(dueWhere);

        // Roll the (med, status, count) tuples into the { taken,
        // missed, skipped, adherenceRate } shape the caller wants.
        for (const row of rows) {
          const existing = adherenceByMedicationId.get(row.medicationId) ?? {
            totalDoses: 0,
            taken: 0,
            missed: 0,
            skipped: 0,
            adherenceRate: 0,
          };
          existing.totalDoses += row.count;
          if (row.status === 'TAKEN' || row.status === 'ADMINISTERED') {
            existing.taken += row.count;
          } else if (row.status === 'MISSED') {
            existing.missed += row.count;
          } else if (row.status === 'SKIPPED') {
            existing.skipped += row.count;
          }
          adherenceByMedicationId.set(row.medicationId, existing);
        }
        for (const summary of adherenceByMedicationId.values()) {
          summary.adherenceRate =
            summary.totalDoses > 0
              ? (summary.taken / summary.totalDoses) * 100
              : 100;
        }
      } catch (error) {
        // Adherence is non-critical — if the batched lookup fails we
        // still return the medication list with `adherence: null`.
        this.logger.warn(
          `Batched medication adherence lookup failed for patient ${patientId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    for (const med of activeMedications) {
      if (med.isPRN) continue;
      const summary = adherenceByMedicationId.get(med.medicationId);
      if (summary && summary.totalDoses > 0) {
        med.adherence = summary;
      }
    }

    return activeMedications;
  }
}
