import type { TimelineEventType } from './timeline-event.types';

export interface TimelineFetchParams {
  patientId: string;
  clinicId: string;
  from?: Date;
  to?: Date;
}

export interface IPatientTimelineSource {
  readonly eventType: TimelineEventType;
  fetch(params: TimelineFetchParams): Promise<unknown[]>;
}
