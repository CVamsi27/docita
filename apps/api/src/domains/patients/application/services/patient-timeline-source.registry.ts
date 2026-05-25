import { Injectable } from '@nestjs/common';
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
    return Promise.allSettled(
      sources.map(async (source) => ({
        type: source.eventType,
        items: await source.fetch(params),
      })),
    );
  }
}
