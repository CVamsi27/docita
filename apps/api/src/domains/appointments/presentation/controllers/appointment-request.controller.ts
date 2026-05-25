import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import {
  ApproveAppointmentRequestDto,
  ListAppointmentRequestsQueryDto,
  RejectAppointmentRequestDto,
} from '@/domains/appointments/application/dto/appointments.dto';
import { AppointmentRequestService } from '@/domains/appointments/application/services/appointment-request.service';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import {
  logClinicPhiListRead,
  logPatientPhiRead,
} from '@/shared/modules/audit/audit/patient-access-audit.util';

@ApiTags('appointment-requests')
@Controller('appointment-requests')
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
export class AppointmentRequestController {
  constructor(
    private readonly appointmentRequestService: AppointmentRequestService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List patient appointment requests' })
  async list(
    @Request() req: RequestWithUser,
    @Query() query: ListAppointmentRequestsQueryDto,
  ) {
    if (query.patientId) {
      await logPatientPhiRead(
        this.auditService,
        req,
        query.patientId,
        'VIEW_HISTORY',
      );
    } else {
      await logClinicPhiListRead(
        this.auditService,
        req,
        'VIEW_APPOINTMENT_LIST',
        'Appointment',
        { scope: 'appointment-requests', ...query },
      );
    }

    const { clinicId } = getClinicStaffRequestContext(req);
    return this.appointmentRequestService.listRequests(clinicId, query);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve and book a patient appointment request' })
  async approve(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: ApproveAppointmentRequestDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.appointmentRequestService.approveRequest(
      id,
      clinicId,
      userId,
      body,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a patient appointment request' })
  async reject(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: RejectAppointmentRequestDto,
  ) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.appointmentRequestService.rejectRequest(
      id,
      clinicId,
      userId,
      body,
    );
  }
}
