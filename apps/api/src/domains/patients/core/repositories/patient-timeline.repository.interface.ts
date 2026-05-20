import type { IPatientTimelineSnapshotRepository } from './timeline/patient-timeline-snapshot.repository.interface';

export type { TimelineEventType } from './timeline/timeline-event.types';
export type {
  IPatientTimelineSource,
  TimelineFetchParams,
} from './timeline/timeline-fetch.types';
export { PATIENT_TIMELINE_SOURCE_REGISTRY_TOKEN } from './timeline/timeline-fetch.types';
export type { IPatientTimelineSnapshotRepository } from './timeline/patient-timeline-snapshot.repository.interface';
export {
  PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN,
  PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN as PATIENT_TIMELINE_REPOSITORY_TOKEN,
} from './timeline/patient-timeline-snapshot.repository.interface';

/**
 * Snapshot reads (conditions, vitals, adherence). Timeline event fetches use
 * `PatientTimelineSourceRegistry` + `IPatientTimelineSource` implementations.
 */
export type IPatientTimelineRepository = IPatientTimelineSnapshotRepository;
