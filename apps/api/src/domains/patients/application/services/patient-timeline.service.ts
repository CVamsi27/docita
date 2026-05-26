import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import {
  IPatientTimelineRepository,
  PATIENT_TIMELINE_REPOSITORY_TOKEN,
} from '@/domains/patients/core/repositories/patient-timeline.repository.interface';
import {
  TimelineEventType,
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

interface TimelineQuery {
  eventTypes?: TimelineEventType[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Facade — delegates patient timeline reads to PatientTimelineQueryService.
 */
@Injectable()
export class PatientTimelineService {
  constructor(private readonly queryService: PatientTimelineQueryService) {}

  constructor(
    @Inject(PATIENT_TIMELINE_REPOSITORY_TOKEN)
    private readonly repository: IPatientTimelineRepository,
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

    const fetchers = await Promise.allSettled([
      types.includes('APPOINTMENT')
        ? this.repository
            .fetchAppointments(patientId, clinicId, fromDate, toDate)
            .then((items) => mapAppointments(items))
        : Promise.resolve([]),
      types.includes('PRESCRIPTION')
        ? this.repository
            .fetchPrescriptions(patientId, fromDate, toDate)
            .then((items) => mapPrescriptions(items))
        : Promise.resolve([]),
      types.includes('METRIC_RECORD')
        ? this.repository
            .fetchMetricRecords(patientId, clinicId, fromDate, toDate)
            .then((items) => mapMetricRecords(items))
        : Promise.resolve([]),
      types.includes('LAB_TEST')
        ? this.repository
            .fetchLabTests(patientId, clinicId, fromDate, toDate)
            .then((items) => mapLabTests(items))
        : Promise.resolve([]),
      types.includes('MEDICAL_DOCUMENT')
        ? this.repository
            .fetchMedicalDocuments(patientId, clinicId, fromDate, toDate)
            .then((items) => mapMedicalDocuments(items))
        : Promise.resolve([]),
      types.includes('FOLLOW_UP')
        ? this.repository
            .fetchFollowUps(patientId, clinicId, fromDate, toDate)
            .then((items) => mapFollowUps(items))
        : Promise.resolve([]),
      types.includes('IMMUNIZATION')
        ? this.repository
            .fetchImmunizations(patientId, clinicId, fromDate, toDate)
            .then((items) => mapImmunizations(items))
        : Promise.resolve([]),
      types.includes('ADMISSION')
        ? this.repository
            .fetchAdmissions(patientId, fromDate, toDate)
            .then((items) => mapAdmissions(items))
        : Promise.resolve([]),
      types.includes('MEDICATION_DOSE')
        ? this.repository
            .fetchMedicationDoses(patientId, clinicId, fromDate, toDate)
            .then((items) => mapMedicationDoses(items))
        : Promise.resolve([]),
    ]);

    const allEvents: TimelineEvent[] = [];
    for (const result of fetchers) {
      if (result.status === 'fulfilled') {
        allEvents.push(...result.value);
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
        this.repository.fetchPatientConditions(patientId),
        this.repository.fetchPatientAllergies(patientId),
        this.repository.fetchRecentPrescriptionsWithMedications(patientId, 5),
        this.repository.fetchLatestVitals(patientId, clinicId),
      ]);

    const now = new Date();
    const nonPrnMedicationIds: string[] = [];
    const activeMedications: Array<{
      medicationId: string;
      name: string;
      dosage: string;
      frequency: string;
      isPRN: boolean;
      adherenceRate: number | null;
    }> = [];

    for (const prescription of prescriptions as Array<{
      medications: Array<{
        id: string;
        name: string;
        dosage: string;
        frequency: string;
        isPRN: boolean;
        endDate: Date | null;
      }>;
    }>) {
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
          await this.repository.groupMedicationDosesByMedicationIds(
            patientId,
            clinicId,
            uniqueNonPrnMedicationIds,
          );

        const adherenceMap = buildAdherenceMap(groupedCounts);
        for (const [medicationId, rate] of adherenceMap.entries()) {
          adherenceByMedicationId.set(medicationId, rate);
        }
      } catch {
        this.logger.warn(
          'Could not fetch medication adherence in batch for patient snapshot',
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
      activeConditions: (
        conditions as Array<{
          id: string;
          conditionName: string;
          status: string;
          severity: string | null;
        }>
      ).map((c) => ({
        id: c.id,
        conditionName: c.conditionName,
        status: c.status,
        severity: c.severity,
      })),
      activeAllergies: (
        allergies as Array<{
          id: string;
          allergen: string;
          severity: string | null;
          allergyType: string;
        }>
      ).map((a) => ({
        id: a.id,
        allergen: a.allergen,
        severity: a.severity,
        allergyType: a.allergyType,
      })),
      activeMedications: enrichedActiveMedications,
      latestVitals: latestVitals
        ? (() => {
            const v = latestVitals as {
              systolicBP: number | null;
              diastolicBP: number | null;
              pulse: number | null;
              temperature: number | null;
              spo2: number | null;
              weight: number | null;
              createdAt: Date;
            };
            return {
              systolicBP: v.systolicBP,
              diastolicBP: v.diastolicBP,
              pulse: v.pulse,
              temperature: v.temperature,
              spo2: v.spo2,
              weight: v.weight,
              recordedAt: v.createdAt.toISOString(),
            };
          })()
        : null,
    };
  }

  private async verifyPatientAccess(
    clinicId: string,
    patientId: string,
    query: Parameters<PatientTimelineQueryService['getTimeline']>[2],
  ) {
    return this.queryService.getTimeline(clinicId, patientId, query);
  }

  getPatientSnapshot(clinicId: string, patientId: string) {
    return this.queryService.getPatientSnapshot(clinicId, patientId);
  }
}
