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
} from '@nestjs/common';
import { DoctorAvailabilityService } from './doctor-availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TierGuard } from '../auth/tier.guard';
import { RequireFeature, Feature } from '../auth/tier.decorator';

// DayOfWeek type matching schema
type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

interface AuthRequest {
  user: {
    id: string;
    clinicId: string;
    role: string;
  };
}

interface CreateScheduleDto {
  doctorId?: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration?: number;
  isActive?: boolean;
}

interface UpdateScheduleDto {
  startTime?: string;
  endTime?: string;
  slotDuration?: number;
  isActive?: boolean;
}

interface BulkScheduleDto {
  doctorId?: string;
  schedules: Array<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDuration?: number;
    isActive?: boolean;
  }>;
}

interface CreateTimeOffDto {
  doctorId?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isFullDay?: boolean;
  startTime?: string;
  endTime?: string;
}

@Controller('doctor-availability')
@UseGuards(JwtAuthGuard, TierGuard)
@RequireFeature(Feature.CALENDAR_SLOTS)
export class DoctorAvailabilityController {
  constructor(
    private readonly doctorAvailabilityService: DoctorAvailabilityService,
  ) {}

  // ============================================================================
  // Schedules
  // ============================================================================

  /**
   * Get all schedules for a doctor (optionally filtered by clinic)
   */
  @Get('schedules')
  getMySchedules(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
  ) {
    // If doctorId is provided and user is admin, use that; otherwise use logged in user
    const targetDoctorId =
      req.user.role === 'ADMIN' && doctorId ? doctorId : req.user.id;
    return this.doctorAvailabilityService.getSchedules(
      targetDoctorId,
      req.user.clinicId,
    );
  }

  /**
   * Get all schedules for the clinic (for admins and receptionists)
   */
  @Get('schedules/clinic')
  getClinicSchedules(@Request() req: AuthRequest) {
    return this.doctorAvailabilityService.getSchedulesByClinic(
      req.user.clinicId,
    );
  }

  /**
   * Create a new schedule entry
   */
  @Post('schedules')
  createSchedule(@Request() req: AuthRequest, @Body() dto: CreateScheduleDto) {
    const doctorId =
      req.user.role === 'ADMIN' && dto.doctorId ? dto.doctorId : req.user.id;
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
   * Bulk create/update schedules for a doctor
   */
  @Post('schedules/bulk')
  bulkUpsertSchedules(
    @Request() req: AuthRequest,
    @Body() dto: BulkScheduleDto,
  ) {
    const doctorId =
      req.user.role === 'ADMIN' && dto.doctorId ? dto.doctorId : req.user.id;
    return this.doctorAvailabilityService.bulkUpsertSchedules(
      doctorId,
      req.user.clinicId,
      dto.schedules,
    );
  }

  /**
   * Update a schedule entry
   */
  @Put('schedules/:id')
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

  /**
   * Get time offs for a doctor
   */
  @Get('time-off')
  getTimeOffs(
    @Request() req: AuthRequest,
    @Query('doctorId') doctorId?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    const targetDoctorId =
      req.user.role === 'ADMIN' && doctorId ? doctorId : req.user.id;
    return this.doctorAvailabilityService.getTimeOffs(targetDoctorId, {
      clinicId: req.user.clinicId,
      upcoming: upcoming === 'true',
    });
  }

  /**
   * Create a time off record
   */
  @Post('time-off')
  createTimeOff(@Request() req: AuthRequest, @Body() dto: CreateTimeOffDto) {
    const doctorId =
      req.user.role === 'ADMIN' && dto.doctorId ? dto.doctorId : req.user.id;
    return this.doctorAvailabilityService.createTimeOff({
      doctorId,
      clinicId: req.user.clinicId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      isFullDay: dto.isFullDay,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
  }

  /**
   * Delete a time off record
   */
  @Delete('time-off/:id')
  deleteTimeOff(@Param('id') id: string) {
    return this.doctorAvailabilityService.deleteTimeOff(id);
  }

  // ============================================================================
  // Available Slots
  // ============================================================================

  /**
   * Get available slots for a specific date
   */
  @Get('slots')
  getAvailableSlots(
    @Request() req: AuthRequest,
    @Query('date') date: string,
    @Query('doctorId') doctorId?: string,
  ) {
    if (!date) {
      return [];
    }
    return this.doctorAvailabilityService.getAvailableSlots(
      req.user.clinicId,
      date,
      doctorId,
    );
  }
}
