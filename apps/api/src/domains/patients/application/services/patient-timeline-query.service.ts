import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  IPatientTimelineSnapshotRepository,
  PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN,
} from '@/domains/patients/core/repositories/timeline/patient-timeline-snapshot.repository.interface';
import type { TimelineEventType } from '@/domains/patients/core/repositories/timeline/timeline-event.types';
import { PatientTimelineSourceRegistry } from './patient-timeline-source.registry';
import {
  TimelineEvent,
  mapAppointments,
  mapPrescriptions,
  mapMetricRecords,
  mapLabTests,
  mapMedicalDocuments,
  mapFollowUps,
  mapImmunizations,
  mapAdmissions,
  mapMedicationDoses,
  sortAndSummarize,
  buildAdherenceMap,
} from './patient-timeline-aggregator';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

interface TimelineQuery {
  eventTypes?: TimelineEventType[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

const TIMELINE_MAPPERS: Record<
  TimelineEventType,
  (items: unknown[]) => TimelineEvent[]
> = {
  APPOINTMENT: mapAppointments,
  PRESCRIPTION: mapPrescriptions,
  METRIC_RECORD: mapMetricRecords,
  LAB_TEST: mapLabTests,
  MEDICAL_DOCUMENT: mapMedicalDocuments,
  FOLLOW_UP: mapFollowUps,
  IMMUNIZATION: mapImmunizations,
  ADMISSION: mapAdmissions,
  MEDICATION_DOSE: mapMedicationDoses,
};

@Injectable()
export class PatientTimelineQueryService {
  private readonly logger = new Logger(PatientTimelineQueryService.name);

  constructor(
    @Inject(PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN)
    private readonly snapshotRepository: IPatientTimelineSnapshotRepository,
    private readonly timelineSources: PatientTimelineSourceRegistry,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getTimeline(clinicId: string, patientId: string, query: TimelineQuery) {
    await this.verifyPatientAccess(clinicId, patientId);

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const types: TimelineEventType[] = query.eventTypes ?? [
      'APPOINTMENT',
      'PRESCRIPTION',
      'METRIC_RECORD',
      'LAB_TEST',
      'MEDICAL_DOCUMENT',
      'FOLLOW_UP',
      'IMMUNIZATION',
      'ADMISSION',
      'MEDICATION_DOSE',
    ];

    const fromDate = query.from ? new Date(query.from) : undefined;
    const toDate = query.to ? new Date(query.to) : undefined;

    const fetchResults = await this.timelineSources.fetchRawByType(types, {
      patientId,
      clinicId,
      from: fromDate,
      to: toDate,
    });

    const allEvents: TimelineEvent[] = [];
    for (const result of fetchResults) {
      if (result.status === 'fulfilled') {
        const mapper = TIMELINE_MAPPERS[result.value.type];
        allEvents.push(...mapper(result.value.items));
      } else {
        this.logger.warn('Timeline fetch error:', result.reason);
      }
    }

    const { sorted, summary } = sortAndSummarize(allEvents);
    const paginatedEvents = sorted.slice(offset, offset + limit);

    return {
      events: paginatedEvents,
      total: sorted.length,
      summary,
    };
  }

  async getPatientSnapshot(clinicId: string, patientId: string) {
    await this.verifyPatientAccess(clinicId, patientId);

    const [conditions, allergies, prescriptions, latestVitals] =
      await Promise.all([
        this.snapshotRepository.fetchPatientConditions(patientId),
        this.snapshotRepository.fetchPatientAllergies(patientId),
        this.snapshotRepository.fetchRecentPrescriptionsWithMedications(
          patientId,
          5,
        ),
        this.snapshotRepository.fetchLatestVitals(patientId, clinicId),
      ]);

    const now = this.clock.now();
    const nonPrnMedicationIds: string[] = [];
    const activeMedications: Array<{
      medicationId: string;
      name: string;
      dosage: string;
      frequency: string;
      isPRN: boolean;
      adherenceRate: number | null;
    }> = [];

    for (const prescription of prescriptions) {
      for (const med of prescription.medications) {
        const isActive = !med.endDate || med.endDate >= now;
        if (!isActive) continue;

        if (!med.isPRN) {
          nonPrnMedicationIds.push(med.id);
        }

        activeMedications.push({
          medicationId: med.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          isPRN: med.isPRN,
          adherenceRate: null,
        });
      }
    }

    const adherenceByMedicationId = new Map<string, number | null>();
    const uniqueNonPrnMedicationIds = [...new Set(nonPrnMedicationIds)];
    if (uniqueNonPrnMedicationIds.length > 0) {
      try {
        const groupedCounts =
          await this.snapshotRepository.groupMedicationDosesByMedicationIds(
            patientId,
            clinicId,
            uniqueNonPrnMedicationIds,
          );

        const adherenceMap = buildAdherenceMap(groupedCounts);
        for (const [medicationId, rate] of adherenceMap.entries()) {
          adherenceByMedicationId.set(medicationId, rate);
        }
      } catch (error) {
        // Non-critical enrichment: snapshot still returns without
        // adherence. Log so a recurring failure is visible.
        this.logger.warn(
          'Could not fetch medication adherence in batch for patient snapshot',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    const enrichedActiveMedications = activeMedications.map((medication) => ({
      ...medication,
      adherenceRate: medication.isPRN
        ? null
        : (adherenceByMedicationId.get(medication.medicationId) ?? null),
    }));

    return {
      activeConditions: conditions.map((c) => ({
        id: c.id,
        conditionName: c.conditionName,
        status: c.status,
        severity: c.severity,
      })),
      activeAllergies: allergies.map((a) => ({
        id: a.id,
        allergen: a.allergen,
        severity: a.severity,
        allergyType: a.allergyType,
      })),
      activeMedications: enrichedActiveMedications,
      latestVitals: latestVitals
        ? {
            systolicBP: latestVitals.systolicBP,
            diastolicBP: latestVitals.diastolicBP,
            pulse: latestVitals.pulse,
            temperature: latestVitals.temperature,
            spo2: latestVitals.spo2,
            weight: latestVitals.weight,
            recordedAt: latestVitals.createdAt.toISOString(),
          }
        : null,
    };
  }

  private async verifyPatientAccess(
    clinicId: string,
    patientId: string,
  ): Promise<void> {
    const found = await this.snapshotRepository.verifyPatientAccess(
      patientId,
      clinicId,
    );
    if (!found) throw new NotFoundException('Patient not found');
  }
}
