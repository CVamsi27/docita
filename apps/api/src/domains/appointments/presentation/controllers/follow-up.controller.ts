import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { requireClinicIdFromRequest } from '@/shared/modules/auth/auth/clinic-request-context';
import { FollowUpService } from '@/domains/appointments/application/services/follow-up.service';
import {
  BookFollowUpDto,
  CreateFollowUpDto,
  FollowUpResponseDto,
  ListFollowUpsQueryDto,
} from '@/domains/appointments/application/dto/appointments.dto';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { logClinicPhiListRead } from '@/shared/modules/audit/audit/patient-access-audit.util';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller()
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
export class FollowUpController {
  constructor(
    private readonly followUpService: FollowUpService,
    private readonly auditService: AuditService,
  ) {}

  @Post('appointments/:id/follow-up')
  @ZodSerializerDto(FollowUpResponseDto)
  async createFollowUp(
    @Req() req: RequestWithUser,
    @Param('id') appointmentId: string,
    @Body() body: CreateFollowUpDto,
  ) {
    return this.followUpService.create({
      ...body,
      appointmentId,
      clinicId: requireClinicIdFromRequest(req),
    });
  }

  @Get('follow-ups')
  async getUpcomingFollowUps(
    @Req() req: RequestWithUser,
    @Query() query: ListFollowUpsQueryDto,
  ) {
    const clinicId = requireClinicIdFromRequest(req);
    await logClinicPhiListRead(
      this.auditService,
      req,
      'VIEW_APPOINTMENT_LIST',
      'Appointment',
      {
        scope: 'follow-ups',
        appointmentId: query.appointmentId,
        status: query.status,
        from: query.from,
        to: query.to,
      },
    );
    if (query.appointmentId)
      return this.followUpService.findForAppointment(
        query.appointmentId,
        clinicId,
      );
    return this.followUpService.findForClinic(clinicId, query);
  }

  @Patch('follow-ups/:id/book')
  @ZodSerializerDto(FollowUpResponseDto)
  async bookFollowUp(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: BookFollowUpDto,
  ) {
    return this.followUpService.book(
      id,
      requireClinicIdFromRequest(req),
      body.bookedAppointmentId,
    );
  }

  @Patch('follow-ups/:id/complete')
  @ZodSerializerDto(FollowUpResponseDto)
  async completeFollowUp(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.followUpService.complete(id, requireClinicIdFromRequest(req));
  }

  @Patch('follow-ups/:id/cancel')
  @ZodSerializerDto(FollowUpResponseDto)
  async cancelFollowUp(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.followUpService.cancel(id, requireClinicIdFromRequest(req));
  }
}
