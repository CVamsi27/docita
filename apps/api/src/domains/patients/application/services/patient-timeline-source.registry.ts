import { Injectable } from '@nestjs/common';
import { mapWithConcurrency } from '@workspace/utils';
import type { TimelineEventType } from '@/domains/patients/core/repositories/timeline/timeline-event.types';
import type {
  IPatientTimelineSource,
  TimelineFetchParams,
} from '@/domains/patients/core/repositories/timeline/timeline-fetch.types';
import {
  AdmissionsTimelineSource,
  AppointmentsTimelineSource,
  FollowUpsTimelineSource,
  ImmunizationsTimelineSource,
  LabTestsTimelineSource,
  MedicalDocumentsTimelineSource,
  MedicationDosesTimelineSource,
  MetricRecordsTimelineSource,
  PrescriptionsTimelineSource,
} from '@/domains/patients/infrastructure/persistence/timeline/prisma-patient-timeline-sources';

const TIMELINE_SOURCE_FETCH_CONCURRENCY = 4;

@Injectable()
export class PatientTimelineSourceRegistry {
  private readonly sourcesByType: Map<
    TimelineEventType,
    IPatientTimelineSource
  >;

  constructor(
    appointments: AppointmentsTimelineSource,
    prescriptions: PrescriptionsTimelineSource,
    metricRecords: MetricRecordsTimelineSource,
    labTests: LabTestsTimelineSource,
    medicalDocuments: MedicalDocumentsTimelineSource,
    followUps: FollowUpsTimelineSource,
    immunizations: ImmunizationsTimelineSource,
    admissions: AdmissionsTimelineSource,
    medicationDoses: MedicationDosesTimelineSource,
  ) {
    const sources: IPatientTimelineSource[] = [
      appointments,
      prescriptions,
      metricRecords,
      labTests,
      medicalDocuments,
      followUps,
      immunizations,
      admissions,
      medicationDoses,
    ];
    this.sourcesByType = new Map(
      sources.map((source) => [source.eventType, source]),
    );
  }

  resolve(types: TimelineEventType[]): IPatientTimelineSource[] {
    return types
      .map((type) => this.sourcesByType.get(type))
      .filter((source): source is IPatientTimelineSource => source != null);
  }

  fetchRawByType(
    types: TimelineEventType[],
    params: TimelineFetchParams,
  ): Promise<
    PromiseSettledResult<{ type: TimelineEventType; items: unknown[] }>[]
  > {
    const sources = this.resolve(types);
    return mapWithConcurrency(
      sources,
      TIMELINE_SOURCE_FETCH_CONCURRENCY,
      async (
        source,
      ): Promise<
        PromiseSettledResult<{
          type: TimelineEventType;
          items: unknown[];
        }>
      > => {
        try {
          return {
            status: 'fulfilled',
            value: {
              type: source.eventType,
              items: await source.fetch(params),
            },
          };
        } catch (reason) {
          return { status: 'rejected', reason };
        }
      },
    );
  }
}
