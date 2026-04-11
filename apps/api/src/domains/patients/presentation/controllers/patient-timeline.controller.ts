import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequestWithUser } from '@/common/types/common.types';
import { PatientTimelineService } from '@/domains/patients/application/services/patient-timeline.service';
import { parsePaginationInt } from '@/common/utils/string.utils';

@ApiTags('patient-timeline')
@Controller('patients/:patientId/timeline')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
@ApiBearerAuth('JWT-auth')
export class PatientTimelineController {
  constructor(
    private readonly patientTimelineService: PatientTimelineService,
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
    const eventTypes = query.eventTypes
      ? (query.eventTypes.split(',') as Parameters<
          typeof this.patientTimelineService.getTimeline
        >[2]['eventTypes'])
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
    return this.patientTimelineService.getPatientSnapshot(clinicId, patientId);
  }
}
