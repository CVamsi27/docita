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
import { RequestWithUser } from '@/common/types/common.types';
import { FollowUpService } from '@/domains/appointments/application/services/follow-up.service';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { RequireFeature } from '@/shared/modules/auth/auth/tier.decorator';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import {
  getDbRolesForTarget,
  requireFeatureForTarget,
} from '@/shared/modules/auth/auth/access-matrix.util';

@Controller()
@UseGuards(TierGuard)
@RequireFeature(requireFeatureForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @Post('appointments/:id/follow-up')
  async createFollowUp(
    @Req() req: RequestWithUser,
    @Param('id') appointmentId: string,
    @Body()
    body: {
      patientId: string;
      doctorId: string;
      scheduledDate: string;
      reason: string;
    },
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
    @Query('appointmentId') appointmentId?: string,
  ) {
    const clinicId = req.user!.clinicId!;
    if (appointmentId) {
      return this.followUpService.findForAppointment(appointmentId, clinicId);
    }
    return this.followUpService.findUpcoming(clinicId);
  }

  @Patch('follow-ups/:id/book')
  async bookFollowUp(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body('bookedAppointmentId') bookedAppointmentId: string,
  ) {
    return this.followUpService.book(
      id,
      req.user!.clinicId!,
      bookedAppointmentId,
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
