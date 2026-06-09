// jscpd:ignore-start
import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '@workspace/db';
import { APP_ACCESS_TARGETS } from '@workspace/types';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '@/shared/modules/auth/auth/tier.guard';
import {
  Feature,
  RequireFeature,
} from '@/shared/modules/auth/auth/tier.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';
import { RequestWithUser } from '@/shared/common/types/common.types';
import { getClinicStaffRequestContext } from '@/shared/modules/auth/auth/clinic-request-context';
import { DoctorDelayService } from '@/domains/appointments/application/services/doctor-delay.service';
import { MarkDoctorDelayDto } from '@/domains/appointments/application/dto/appointments.dto';
import { markDoctorDelaySchema } from '@workspace/types';

// check-phi-read-audit: allow-file — operational delay metadata only; no patient record reads on GET
@ApiTags('doctor-delays')
@Controller('doctor-delays')
@UseGuards(TierGuard)
@RequireFeature(Feature.CALENDAR_SLOTS)
@Roles(...getDbRolesForTarget(APP_ACCESS_TARGETS.API_APPOINTMENTS))
export class DoctorDelayController {
  constructor(private readonly doctorDelayService: DoctorDelayService) {}

  @Post()
  @Roles(
    // jscpd:ignore-end
    Role.ADMIN,
    Role.DOCTOR,
    Role.ADMIN_DOCTOR,
    Role.RECEPTIONIST,
    Role.NURSE,
  )
  @ApiOperation({
    summary: 'Mark a doctor delay and shift upcoming appointments',
  })
  async markDelay(
    @Request() req: RequestWithUser,
    @Body() body: MarkDoctorDelayDto,
  ) {
    const parsed = markDoctorDelaySchema.parse(body);
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    return this.doctorDelayService.markDelay({
      clinicId,
      doctorId: parsed.doctorId,
      delayMinutes: parsed.delayMinutes,
      reason: parsed.reason,
      markedById: userId,
    });
  }

  @Delete(':id')
  @Roles(
    Role.ADMIN,
    Role.DOCTOR,
    Role.ADMIN_DOCTOR,
    Role.RECEPTIONIST,
    Role.NURSE,
  )
  @ApiOperation({ summary: 'Clear an active doctor delay' })
  async clearDelay(@Param('id') id: string, @Request() req: RequestWithUser) {
    const { clinicId, userId } = getClinicStaffRequestContext(req);
    await this.doctorDelayService.clearDelay(id, clinicId, userId);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active delays for the clinic' })
  async getActiveDelays(@Request() req: RequestWithUser) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.doctorDelayService.getActiveDelaysForClinic(clinicId);
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get active delay for a specific doctor' })
  async getActiveDelayForDoctor(
    @Param('doctorId') doctorId: string,
    @Request() req: RequestWithUser,
  ) {
    const { clinicId } = getClinicStaffRequestContext(req);
    return this.doctorDelayService.getActiveDelay(doctorId, clinicId);
  }
}
