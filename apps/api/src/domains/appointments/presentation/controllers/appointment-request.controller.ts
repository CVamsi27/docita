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

@ApiTags('appointment-requests')
@Controller('appointment-requests')
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
export class AppointmentRequestController {
  constructor(
    private readonly appointmentRequestService: AppointmentRequestService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List patient appointment requests' })
  async list(
    @Request() req: RequestWithUser,
    @Query() query: ListAppointmentRequestsQueryDto,
  ) {
    return this.appointmentRequestService.listRequests(
      req.user!.clinicId!,
      query,
    );
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve and book a patient appointment request' })
  async approve(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: ApproveAppointmentRequestDto,
  ) {
    return this.appointmentRequestService.approveRequest(
      id,
      req.user!.clinicId!,
      req.user!.id,
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
    return this.appointmentRequestService.rejectRequest(
      id,
      req.user!.clinicId!,
      req.user!.id,
      body,
    );
  }
}
