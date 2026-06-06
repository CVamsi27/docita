import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { JwtAuthGuard } from '@/shared/modules/auth/auth/jwt-auth.guard';
import { PatientPortalSession } from '@/shared/modules/auth/auth/patient-portal-session.decorator';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { SkipSubscriptionCheck } from '@/shared/modules/auth/decorators';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireAuthenticatedUserId } from '@/shared/modules/auth/auth/clinic-request-context';
import { PatientPortalContextService } from '@/domains/patient-portal/application/services/patient-portal-context.service';
import { PatientTimelineService } from '@/domains/patients/application/services/patient-timeline.service';
import { parsePaginationInt } from '@/shared/common/utils/string.utils';
import { MedicationDoseService } from '@/domains/patients/application/services/medication-dose.service';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { auditPatientPortalRead } from '@/domains/patient-portal/presentation/controllers/patient-portal-controller.helpers';
import {
  medicationDoseStatusSchema,
  timelineEventTypeSchema,
  type MedicationDoseStatus,
  type TimelineEventType,
} from '@workspace/types';
import { parseStringEnumMember } from '@workspace/utils';

const MEDICATION_DOSE_STATUSES = medicationDoseStatusSchema.options;
const TIMELINE_EVENT_TYPES = timelineEventTypeSchema.options;

function parseTimelineEventTypes(
  raw: string | undefined,
): TimelineEventType[] | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  const parsed = raw
    .split(',')
    .map((value) => value.trim())
    .flatMap((value) => {
      const match = parseStringEnumMember(TIMELINE_EVENT_TYPES, value);
      return match ? [match] : [];
    });
  return parsed.length > 0 ? parsed : undefined;
}

function parseMedicationDoseStatusQuery(
  status: string | undefined,
): MedicationDoseStatus | undefined {
  if (!status) return undefined;
  return parseStringEnumMember(MEDICATION_DOSE_STATUSES, status) ?? undefined;
}

@ApiTags('patient-portal')
@Controller('patient-portal')
@PatientPortalSession()
@UseGuards(JwtAuthGuard)
@Roles(Role.PATIENT)
@SkipSubscriptionCheck()
@ApiBearerAuth('JWT-auth')
export class PatientPortalClinicalController {
  constructor(
    private readonly contextService: PatientPortalContextService,
    private readonly timelineService: PatientTimelineService,
    private readonly medicationDoseService: MedicationDoseService,
    private readonly auditService: AuditService,
  ) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Get unified patient timeline' })
  async getTimeline(
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
    const { patientId, clinicId } = await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    const eventTypes = parseTimelineEventTypes(query.eventTypes);
    return this.timelineService.getTimeline(clinicId, patientId, {
      eventTypes,
      from: query.from,
      to: query.to,
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Get('timeline/snapshot')
  @ApiOperation({ summary: 'Get patient clinical snapshot' })
  async getSnapshot(@Request() req: RequestWithUser) {
    const { patientId, clinicId } = await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    return this.timelineService.getPatientSnapshot(clinicId, patientId);
  }

  @Get('medications/active')
  @ApiOperation({ summary: 'Get active medications' })
  async getActiveMedications(@Request() req: RequestWithUser) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      requireAuthenticatedUserId(req),
    );
    return this.medicationDoseService.getActiveMedications(clinicId, patientId);
  }

  @Get('medications/doses')
  @ApiOperation({ summary: 'Get medication dose history' })
  async getDoseHistory(
    @Request() req: RequestWithUser,
    @Query()
    query: {
      prescriptionId?: string;
      from?: string;
      to?: string;
      status?: string;
      limit?: string;
      offset?: string;
    },
  ) {
    const { patientId, clinicId } = await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    return this.medicationDoseService.getDoseHistory(clinicId, patientId, {
      prescriptionId: query.prescriptionId,
      from: query.from,
      to: query.to,
      status: parseMedicationDoseStatusQuery(query.status),
      limit: parsePaginationInt(query.limit, { min: 1, max: 200 }),
      offset: parsePaginationInt(query.offset, { min: 0 }),
    });
  }

  @Post('medications/doses')
  @ApiOperation({ summary: 'Patient self-report a dose' })
  async recordDose(
    @Request() req: RequestWithUser,
    @Body()
    body: {
      medicationId: string;
      takenAt?: string;
      status: 'TAKEN' | 'MISSED' | 'SKIPPED';
      doseAmount?: string;
      notes?: string;
    },
  ) {
    const { patientId, clinicId } = await this.contextService.getPatientContext(
      requireAuthenticatedUserId(req),
    );
    return this.medicationDoseService.recordAdHocDose(
      clinicId,
      patientId,
      {
        medicationId: body.medicationId,
        takenAt: body.takenAt ? new Date(body.takenAt) : undefined,
        doseAmount: body.doseAmount,
        notes: body.notes,
      },
      'PATIENT_REPORTED',
    );
  }

  @Get('medications/adherence')
  @ApiOperation({ summary: 'Get medication adherence summary' })
  async getAdherence(
    @Request() req: RequestWithUser,
    @Query() query: { prescriptionId?: string },
  ) {
    const { patientId, clinicId } = await auditPatientPortalRead(
      this.contextService,
      this.auditService,
      req,
      'VIEW_HISTORY',
    );
    return this.medicationDoseService.getAdherenceSummary(
      clinicId,
      patientId,
      query.prescriptionId,
    );
  }
}
