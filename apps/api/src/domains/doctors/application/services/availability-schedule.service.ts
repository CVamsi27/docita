import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Prisma, Role } from '@workspace/db';
import { TimeUtils } from '@/shared/common/utils/time.utils';
import {
  IDoctorScheduleRepository,
  DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

@Injectable()
export class AvailabilityScheduleService {
  constructor(
    @Inject(DOCTOR_SCHEDULE_REPOSITORY_TOKEN)
    private repository: IDoctorScheduleRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async getSchedules(doctorId: string, clinicId?: string) {
    return this.repository.findSchedules(doctorId, clinicId);
  }

  async getSchedulesByClinic(clinicId: string) {
    return this.repository.findSchedulesByClinic(clinicId);
  }

  async createSchedule(data: {
    doctorId: string;
    clinicId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    slotDuration?: number;
    isActive?: boolean;
  }) {
    if (!TimeUtils.validateTimeFormat(data.startTime)) {
      throw new BadRequestException(
        `Invalid start time format: ${data.startTime}. Use HH:MM format.`,
      );
    }
    if (!TimeUtils.validateTimeFormat(data.endTime)) {
      throw new BadRequestException(
        `Invalid end time format: ${data.endTime}. Use HH:MM format.`,
      );
    }

    if (
      TimeUtils.timeToMinutes(data.endTime) <=
      TimeUtils.timeToMinutes(data.startTime)
    ) {
      throw new BadRequestException('End time must be after start time');
    }

    const existing = await this.repository.findScheduleByDoctorClinicDay(
      data.doctorId,
      data.clinicId,
      data.dayOfWeek,
    );

    if (existing) {
      throw new BadRequestException(
        `Schedule already exists for this day. Use update instead.`,
      );
    }

    return this.repository.createSchedule({
      doctor: { connect: { id: data.doctorId } },
      clinic: { connect: { id: data.clinicId } },
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotDuration: data.slotDuration || 30,
      isActive: data.isActive ?? true,
    });
  }

  async updateSchedule(
    id: string,
    data: {
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      isActive?: boolean;
    },
    options?: { clinicId?: string; actorUserId?: string; actorRole?: Role },
  ) {
    if (data.startTime && !TimeUtils.validateTimeFormat(data.startTime)) {
      throw new BadRequestException(
        `Invalid start time format: ${data.startTime}. Use HH:MM format.`,
      );
    }
    if (data.endTime && !TimeUtils.validateTimeFormat(data.endTime)) {
      throw new BadRequestException(
        `Invalid end time format: ${data.endTime}. Use HH:MM format.`,
      );
    }

    const schedule = await this.repository.findScheduleById(id);

    if (
      !schedule ||
      (options?.clinicId && schedule.clinicId !== options.clinicId)
    ) {
      throw new NotFoundException('Schedule not found');
    }

    const isAdmin =
      options?.actorRole === Role.ADMIN ||
      options?.actorRole === Role.ADMIN_DOCTOR;
    if (!isAdmin) {
      if (!options?.actorUserId) {
        throw new ForbiddenException('Authenticated user is required');
      }
      if (schedule.doctorId !== options.actorUserId) {
        throw new ForbiddenException('You can only manage your own schedule');
      }
    }

    const newStartTime = data.startTime || schedule.startTime;
    const newEndTime = data.endTime || schedule.endTime;

    if (
      TimeUtils.timeToMinutes(newEndTime) <=
      TimeUtils.timeToMinutes(newStartTime)
    ) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.repository.updateSchedule(id, data);
  }

  async deleteSchedule(
    id: string,
    options?: { clinicId?: string; actorUserId?: string; actorRole?: Role },
  ) {
    const schedule = await this.repository.findScheduleById(id);

    if (
      !schedule ||
      (options?.clinicId && schedule.clinicId !== options.clinicId)
    ) {
      throw new NotFoundException('Schedule not found');
    }

    const isAdmin =
      options?.actorRole === Role.ADMIN ||
      options?.actorRole === Role.ADMIN_DOCTOR;
    if (!isAdmin) {
      if (!options?.actorUserId) {
        throw new ForbiddenException('Authenticated user is required');
      }
      if (schedule.doctorId !== options.actorUserId) {
        throw new ForbiddenException('You can only manage your own schedule');
      }
    }

    await this.repository.deleteSchedule(id);
    return { success: true };
  }

  async bulkUpsertSchedules(
    doctorId: string,
    clinicId: string,
    schedules: Array<{
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      slotDuration?: number;
      isActive?: boolean;
    }>,
  ) {
    for (const schedule of schedules) {
      if (!TimeUtils.validateTimeFormat(schedule.startTime)) {
        throw new BadRequestException(
          `Invalid start time format for ${schedule.dayOfWeek}`,
        );
      }
      if (!TimeUtils.validateTimeFormat(schedule.endTime)) {
        throw new BadRequestException(
          `Invalid end time format for ${schedule.dayOfWeek}`,
        );
      }
      if (
        TimeUtils.timeToMinutes(schedule.endTime) <=
        TimeUtils.timeToMinutes(schedule.startTime)
      ) {
        throw new BadRequestException(
          `End time must be after start time for ${schedule.dayOfWeek}`,
        );
      }
    }

    await this.repository.deleteManySchedules(doctorId, clinicId);

    await this.repository.createManySchedules(
      schedules.map((s) => ({
        ...s,
        doctorId,
        clinicId,
      })),
    );

    return { count: schedules.length };
  }

  async getTimeOffs(
    doctorId: string,
    options?: { clinicId?: string; upcoming?: boolean },
  ) {
    const where: Prisma.DoctorTimeOffWhereInput = { doctorId };

    if (options?.clinicId) {
      where.OR = [{ clinicId: options.clinicId }, { clinicId: null }];
    }

    if (options?.upcoming) {
      where.endDate = { gte: this.clock.now() };
    }

    return this.repository.findTimeOffs(where);
  }

  async createTimeOff(
    data: {
      doctorId: string;
      clinicId?: string;
      startDate: Date | string;
      endDate: Date | string;
      reason?: string;
      isFullDay?: boolean;
      startTime?: string;
      endTime?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }

    if (!data.isFullDay) {
      if (!data.startTime || !data.endTime) {
        throw new BadRequestException(
          'Start time and end time are required for partial day off',
        );
      }
      if (!TimeUtils.validateTimeFormat(data.startTime)) {
        throw new BadRequestException('Invalid start time format');
      }
      if (!TimeUtils.validateTimeFormat(data.endTime)) {
        throw new BadRequestException('Invalid end time format');
      }
      if (
        TimeUtils.timeToMinutes(data.endTime) <=
        TimeUtils.timeToMinutes(data.startTime)
      ) {
        throw new BadRequestException(
          'Partial-day time-off endTime must be after startTime',
        );
      }
    }

    return this.repository.createTimeOff(
      {
        doctor: { connect: { id: data.doctorId } },
        clinic: data.clinicId ? { connect: { id: data.clinicId } } : undefined,
        startDate,
        endDate,
        reason: data.reason,
        isFullDay: data.isFullDay ?? true,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      },
      tx,
    );
  }

  async deleteTimeOff(
    id: string,
    options?: { clinicId?: string; actorUserId?: string; actorRole?: Role },
  ) {
    const timeOff = await this.repository.findTimeOffById(id);

    if (
      !timeOff ||
      (options?.clinicId && timeOff.clinicId !== options.clinicId)
    ) {
      throw new NotFoundException('Time off record not found');
    }

    const isAdmin =
      options?.actorRole === Role.ADMIN ||
      options?.actorRole === Role.ADMIN_DOCTOR;
    if (!isAdmin) {
      if (!options?.actorUserId) {
        throw new ForbiddenException('Authenticated user is required');
      }
      if (timeOff.doctorId !== options.actorUserId) {
        throw new ForbiddenException('You can only manage your own time off');
      }
    }

    await this.repository.deleteTimeOff(id);
    return { success: true };
  }

  getUnavailableDoctorIdsForCalendarDate(
    clinicId: string,
    date: Date | string,
  ): Promise<string[]> {
    const target = new Date(date);
    const rangeStart = new Date(target);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(target);
    rangeEnd.setHours(23, 59, 59, 999);
    return this.repository.findDoctorIdsWithFullDayTimeOffOverlappingRange(
      clinicId,
      rangeStart,
      rangeEnd,
    );
  }
}
