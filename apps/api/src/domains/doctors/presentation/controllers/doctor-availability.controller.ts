import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { DoctorAvailabilityService } from '../../application/services/doctor-availability.service';
import { Role } from '@workspace/db';
import { Roles } from '../../../../shared/modules/auth/auth/roles.decorator';
import { TierGuard } from '../../../../shared/modules/auth/auth/tier.guard';
import {
  RequireFeature,
  Feature,
} from '../../../../shared/modules/auth/auth/tier.decorator';

import {
  BulkScheduleDto,
  bulkScheduleSchema,
  createScheduleSchema,
  CreateScheduleDto,
  updateScheduleSchema,
  UpdateScheduleDto,
  createTimeOffSchema,
  CreateTimeOffDto,
} from '../../application/dto/doctor-availability.dto';
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe';
import { RequestWithUser } from '../../../../common/types/common.types';

@Controller('doctor-availability')
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.ADMIN_DOCTOR)
@UseGuards(TierGuard)
@RequireFeature(Feature.CALENDAR_SLOTS)
export class DoctorAvailabilityController {
  constructor(
    private readonly doctorAvailabilityService: DoctorAvailabilityService,
  ) {}

  @Get('schedules/clinic')
  getClinicSchedules(@Request() req: RequestWithUser) {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    return this.doctorAvailabilityService.getSchedulesByClinic(
      req.user.clinicId,
    );
  }

  @Post('schedules/bulk')
  @UsePipes(new ZodValidationPipe(bulkScheduleSchema))
  bulkUpsertSchedules(
    @Request() req: RequestWithUser,
    @Body() dto: BulkScheduleDto,
  ) {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    const doctorId =
      (req.user.role === Role.ADMIN || req.user.role === Role.SUPER_ADMIN) &&
      dto.doctorId
        ? dto.doctorId
        : req.user.id;
    return this.doctorAvailabilityService.bulkUpsertSchedules(
      doctorId,
      req.user.clinicId,
      dto.schedules,
    );
  }

  @Get('schedules')
  getMySchedules(
    @Request() req: RequestWithUser,
    @Query('doctorId') doctorId?: string,
  ) {
    const targetDoctorId =
      (req.user?.role === Role.ADMIN || req.user?.role === Role.SUPER_ADMIN) &&
      doctorId
        ? doctorId
        : req.user!.id;
    return this.doctorAvailabilityService.getSchedules(
      targetDoctorId,
      req.user?.clinicId || undefined,
    );
  }

  @Post('schedules')
  @UsePipes(new ZodValidationPipe(createScheduleSchema))
  createSchedule(
    @Request() req: RequestWithUser,
    @Body() dto: CreateScheduleDto,
  ) {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    const doctorId =
      req.user.role === Role.ADMIN && dto.doctorId ? dto.doctorId : req.user.id;
    return this.doctorAvailabilityService.createSchedule({
      doctorId,
      clinicId: req.user.clinicId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      slotDuration: dto.slotDuration,
      isActive: dto.isActive,
    });
  }

  /**
   * Update a schedule entry
   */
  @Put('schedules/:id')
  @UsePipes(new ZodValidationPipe(updateScheduleSchema))
  updateSchedule(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.doctorAvailabilityService.updateSchedule(id, dto);
  }

  /**
   * Delete a schedule entry
   */
  @Delete('schedules/:id')
  deleteSchedule(@Param('id') id: string) {
    return this.doctorAvailabilityService.deleteSchedule(id);
  }

  // ============================================================================
  // Time Off
  // ============================================================================

  @Get('time-off')
  getTimeOffs(
    @Request() req: RequestWithUser,
    @Query('doctorId') doctorId?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    const targetDoctorId =
      (req.user?.role === Role.ADMIN || req.user?.role === Role.SUPER_ADMIN) &&
      doctorId
        ? doctorId
        : req.user!.id;
    return this.doctorAvailabilityService.getTimeOffs(targetDoctorId, {
      clinicId: req.user?.clinicId || undefined,
      upcoming: upcoming === 'true',
    });
  }

  @Post('time-off')
  @UsePipes(new ZodValidationPipe(createTimeOffSchema))
  createTimeOff(
    @Request() req: RequestWithUser,
    @Body() dto: CreateTimeOffDto,
  ) {
    const doctorId =
      (req.user?.role === Role.ADMIN || req.user?.role === Role.SUPER_ADMIN) &&
      dto.doctorId
        ? dto.doctorId
        : req.user!.id;
    return this.doctorAvailabilityService.createTimeOff({
      doctorId,
      clinicId: req.user?.clinicId || undefined,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      isFullDay: dto.isFullDay,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
  }

  @Delete('time-off/:id')
  deleteTimeOff(@Param('id') id: string) {
    return this.doctorAvailabilityService.deleteTimeOff(id);
  }

  @Get('slots')
  getAvailableSlots(
    @Request() req: RequestWithUser,
    @Query('date') date: string,
    @Query('doctorId') doctorId?: string,
  ) {
    if (!req.user?.clinicId) {
      throw new BadRequestException('Clinic ID is required');
    }
    return this.doctorAvailabilityService.getAvailableSlots(
      req.user.clinicId,
      date,
      doctorId,
    );
  }
}
