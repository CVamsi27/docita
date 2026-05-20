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
import { FollowUpService } from '@/domains/appointments/application/services/follow-up.service';
import {
  BookFollowUpDto,
  CreateFollowUpDto,
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
  async createFollowUp(
    @Req() req: RequestWithUser,
    @Param('id') appointmentId: string,
    @Body() body: CreateFollowUpDto,
  ) {
    return this.followUpService.create({
      ...body,
      appointmentId,
      clinicId: req.user!.clinicId!,
    });
  }

  @Get('follow-ups')
  async getUpcomingFollowUps(
    @Req() req: RequestWithUser,
    @Query() query: ListFollowUpsQueryDto,
  ) {
    const clinicId = req.user!.clinicId!;
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
    if (query.appointmentId) {
      return this.followUpService.findForAppointment(
        query.appointmentId,
        clinicId,
      );
    }
    return this.followUpService.findForClinic(clinicId, query);
  }

  @Patch('follow-ups/:id/book')
  async bookFollowUp(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() body: BookFollowUpDto,
  ) {
    return this.followUpService.book(
      id,
      req.user!.clinicId!,
      body.bookedAppointmentId,
    );
  }

  @Patch('follow-ups/:id/complete')
  async completeFollowUp(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.followUpService.complete(id, req.user!.clinicId!);
  }

  @Patch('follow-ups/:id/cancel')
  async cancelFollowUp(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.followUpService.cancel(id, req.user!.clinicId!);
  }
}
