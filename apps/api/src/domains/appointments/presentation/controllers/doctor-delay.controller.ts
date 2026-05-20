import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
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
import { DoctorDelayService } from '@/domains/appointments/application/services/doctor-delay.service';

const markDelaySchema = z.object({
  doctorId: z.string().min(1),
  delayMinutes: z.number().int().min(1).max(480),
  reason: z.string().max(500).optional(),
});

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
    Role.ADMIN,
    Role.DOCTOR,
    Role.ADMIN_DOCTOR,
    Role.RECEPTIONIST,
    Role.NURSE,
  )
  @ApiOperation({
    summary: 'Mark a doctor delay and shift upcoming appointments',
  })
  async markDelay(@Request() req: RequestWithUser, @Body() body: unknown) {
    const parsed = markDelaySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.doctorDelayService.markDelay({
      clinicId: req.user!.clinicId!,
      doctorId: parsed.data.doctorId,
      delayMinutes: parsed.data.delayMinutes,
      reason: parsed.data.reason,
      markedById: req.user!.id,
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
    await this.doctorDelayService.clearDelay(
      id,
      req.user!.clinicId!,
      req.user!.id,
    );
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get all active delays for the clinic' })
  async getActiveDelays(@Request() req: RequestWithUser) {
    return this.doctorDelayService.getActiveDelaysForClinic(
      req.user!.clinicId!,
    );
  }

  @Get('doctor/:doctorId')
  @ApiOperation({ summary: 'Get active delay for a specific doctor' })
  async getActiveDelayForDoctor(
    @Param('doctorId') doctorId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.doctorDelayService.getActiveDelay(
      doctorId,
      req.user!.clinicId!,
    );
  }
}
