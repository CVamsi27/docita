import { Injectable } from '@nestjs/common';
import { PatientTimelineQueryService } from './patient-timeline-query.service';

/**
 * Facade — delegates patient timeline reads to PatientTimelineQueryService.
 */
@Injectable()
export class PatientTimelineService {
  constructor(private readonly queryService: PatientTimelineQueryService) {}

  getTimeline(
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
