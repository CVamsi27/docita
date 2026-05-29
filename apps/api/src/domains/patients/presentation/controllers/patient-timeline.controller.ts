import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatientsTimelineApiAccess } from '@/domains/patients/presentation/controllers/patients.controller.access';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { PatientTimelineService } from '@/domains/patients/application/services/patient-timeline.service';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logPatientPhiRead } from '@/shared/modules/audit/audit/patient-access-audit.util';
import type { TimelineEventType } from '@/domains/patients/core/repositories/timeline/timeline-event.types';
import { parseStringEnumMember } from '@workspace/utils';

const TIMELINE_EVENT_TYPES: readonly TimelineEventType[] = [
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

@ApiTags('patient-timeline')
@Controller('patients/:patientId/timeline')
@PatientsTimelineApiAccess()
@ApiBearerAuth('JWT-auth')
export class PatientTimelineController {
  constructor(
    private readonly patientTimelineService: PatientTimelineService,
    private readonly auditService: AuditService,
  ) {}

  private getClinicId(req: RequestWithUser): string {
    const clinicId = req.user?.clinicId;
    if (!clinicId) throw new NotFoundException('Clinic context required');
    return clinicId;
  }

  @Get()
  @ApiOperation({ summary: 'Get unified patient timeline' })
  async getTimeline(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
    @Query()
    query: {
      eventTypes?: string;
      from?: string;
      to?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    const clinicId = this.getClinicId(req);
    await logPatientPhiRead(this.auditService, req, patientId, 'VIEW_HISTORY');
    const eventTypes = query.eventTypes
      ? query.eventTypes
          .split(',')
          .map((entry) =>
            parseStringEnumMember(TIMELINE_EVENT_TYPES, entry.trim()),
          )
          .filter((entry): entry is TimelineEventType => entry !== null)
      : undefined;

    return this.patientTimelineService.getTimeline(clinicId, patientId, {
      eventTypes,
      from: query.from,
      to: query.to,
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Get patient clinical snapshot' })
  async getSnapshot(
    @Param('patientId') patientId: string,
    @Request() req: RequestWithUser,
  ) {
    const clinicId = this.getClinicId(req);
    await logPatientPhiRead(this.auditService, req, patientId, 'VIEW_HISTORY');
    return this.patientTimelineService.getPatientSnapshot(clinicId, patientId);
  }
}
