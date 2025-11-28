import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@workspace/db';

// DayOfWeek type matching schema
type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

@Injectable()
export class DoctorAvailabilityService {
  constructor(private prisma: PrismaService) {}

  // ============================================================================
  // Doctor Schedules (Weekly Availability)
  // ============================================================================

  async getSchedules(doctorId: string, clinicId?: string) {
    const where: Prisma.DoctorScheduleWhereInput = { doctorId };
    if (clinicId) {
      where.clinicId = clinicId;
    }

    return this.prisma.doctorSchedule.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        clinic: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getSchedulesByClinic(clinicId: string) {
    return this.prisma.doctorSchedule.findMany({
      where: { clinicId, isActive: true },
      orderBy: [
        { doctorId: 'asc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
      include: {
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });
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
    // Validate time format
    this.validateTimeFormat(data.startTime);
    this.validateTimeFormat(data.endTime);

    // Validate end time is after start time
    if (
      this.timeToMinutes(data.endTime) <= this.timeToMinutes(data.startTime)
    ) {
      throw new BadRequestException('End time must be after start time');
    }

    // Check for existing schedule on the same day
    const existing = await this.prisma.doctorSchedule.findUnique({
      where: {
        doctorId_clinicId_dayOfWeek: {
          doctorId: data.doctorId,
          clinicId: data.clinicId,
          dayOfWeek: data.dayOfWeek,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Schedule already exists for this day. Use update instead.`,
      );
    }

    return this.prisma.doctorSchedule.create({
      data: {
        doctorId: data.doctorId,
        clinicId: data.clinicId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        slotDuration: data.slotDuration || 30,
        isActive: data.isActive ?? true,
      },
      include: {
        doctor: {
          select: { id: true, name: true },
        },
      },
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
  ) {
    if (data.startTime) {
      this.validateTimeFormat(data.startTime);
    }
    if (data.endTime) {
      this.validateTimeFormat(data.endTime);
    }

    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const newStartTime = data.startTime || schedule.startTime;
    const newEndTime = data.endTime || schedule.endTime;

    if (this.timeToMinutes(newEndTime) <= this.timeToMinutes(newStartTime)) {
      throw new BadRequestException('End time must be after start time');
    }

    return this.prisma.doctorSchedule.update({
      where: { id },
      data,
      include: {
        doctor: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteSchedule(id: string) {
    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.prisma.doctorSchedule.delete({ where: { id } });
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
    // Validate all schedules
    for (const schedule of schedules) {
      this.validateTimeFormat(schedule.startTime);
      this.validateTimeFormat(schedule.endTime);
      if (
        this.timeToMinutes(schedule.endTime) <=
        this.timeToMinutes(schedule.startTime)
      ) {
        throw new BadRequestException(
          `End time must be after start time for ${schedule.dayOfWeek}`,
        );
      }
    }

    // Delete existing schedules for this doctor-clinic combination
    await this.prisma.doctorSchedule.deleteMany({
      where: { doctorId, clinicId },
    });

    // Create new schedules
    const created = await this.prisma.doctorSchedule.createMany({
      data: schedules.map((s) => ({
        doctorId,
        clinicId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDuration: s.slotDuration || 30,
        isActive: s.isActive ?? true,
      })),
    });

    return this.getSchedules(doctorId, clinicId);
  }

  // ============================================================================
  // Doctor Time Off
  // ============================================================================

  async getTimeOffs(
    doctorId: string,
    options?: { clinicId?: string; upcoming?: boolean },
  ) {
    const where: Prisma.DoctorTimeOffWhereInput = { doctorId };

    if (options?.clinicId) {
      where.OR = [{ clinicId: options.clinicId }, { clinicId: null }];
    }

    if (options?.upcoming) {
      where.endDate = { gte: new Date() };
    }

    return this.prisma.doctorTimeOff.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        clinic: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async createTimeOff(data: {
    doctorId: string;
    clinicId?: string;
    startDate: Date | string;
    endDate: Date | string;
    reason?: string;
    isFullDay?: boolean;
    startTime?: string;
    endTime?: string;
  }) {
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
      this.validateTimeFormat(data.startTime);
      this.validateTimeFormat(data.endTime);
    }

    return this.prisma.doctorTimeOff.create({
      data: {
        doctorId: data.doctorId,
        clinicId: data.clinicId || null,
        startDate,
        endDate,
        reason: data.reason,
        isFullDay: data.isFullDay ?? true,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      },
      include: {
        doctor: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteTimeOff(id: string) {
    const timeOff = await this.prisma.doctorTimeOff.findUnique({
      where: { id },
    });

    if (!timeOff) {
      throw new NotFoundException('Time off record not found');
    }

    await this.prisma.doctorTimeOff.delete({ where: { id } });
    return { success: true };
  }

  // ============================================================================
  // Available Slots (for appointment booking)
  // ============================================================================

  async getAvailableSlots(
    clinicId: string,
    date: Date | string,
    doctorId?: string,
  ) {
    const targetDate = new Date(date);
    const dayOfWeek = this.getDayOfWeek(targetDate);

    // Build where clause for schedules
    const scheduleWhere: Prisma.DoctorScheduleWhereInput = {
      clinicId,
      dayOfWeek,
      isActive: true,
    };
    if (doctorId) {
      scheduleWhere.doctorId = doctorId;
    }

    // Get schedules for the day
    const schedules = await this.prisma.doctorSchedule.findMany({
      where: scheduleWhere,
      include: {
        doctor: {
          select: { id: true, name: true, specialization: true },
        },
      },
    });

    if (schedules.length === 0) {
      return [];
    }

    // Get doctor IDs from schedules
    const doctorIds = [...new Set(schedules.map((s) => s.doctorId))];

    // Get time offs for the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const timeOffs = await this.prisma.doctorTimeOff.findMany({
      where: {
        doctorId: { in: doctorIds },
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        OR: [{ clinicId }, { clinicId: null }],
      },
    });

    // Get existing appointments for the target date
    const appointments = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        doctorId: { in: doctorIds },
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['cancelled', 'no-show'] },
      },
      select: {
        doctorId: true,
        startTime: true,
        endTime: true,
      },
    });

    // Generate available slots
    const slots: Array<{
      time: string;
      endTime: string;
      doctorId: string;
      doctorName: string;
      specialization?: string;
      isAvailable: boolean;
    }> = [];

    for (const schedule of schedules) {
      const doctor = schedule.doctor;
      const doctorTimeOffs = timeOffs.filter(
        (t) => t.doctorId === schedule.doctorId,
      );
      const doctorAppointments = appointments.filter(
        (a) => a.doctorId === schedule.doctorId,
      );

      // Check if doctor has full day off
      const hasFullDayOff = doctorTimeOffs.some((t) => t.isFullDay);
      if (hasFullDayOff) {
        continue; // Skip this doctor for the day
      }

      // Generate time slots
      let currentMinutes = this.timeToMinutes(schedule.startTime);
      const endMinutes = this.timeToMinutes(schedule.endTime);

      while (currentMinutes + schedule.slotDuration <= endMinutes) {
        const slotStart = this.minutesToTime(currentMinutes);
        const slotEnd = this.minutesToTime(
          currentMinutes + schedule.slotDuration,
        );

        // Check if slot is during time off
        const isDuringTimeOff = doctorTimeOffs.some((t) => {
          if (t.isFullDay) return true;
          if (!t.startTime || !t.endTime) return false;
          const offStart = this.timeToMinutes(t.startTime);
          const offEnd = this.timeToMinutes(t.endTime);
          return currentMinutes >= offStart && currentMinutes < offEnd;
        });

        // Check if slot overlaps with existing appointment
        const isBooked = doctorAppointments.some((a) => {
          const apptStart = new Date(a.startTime);
          const apptEnd = new Date(a.endTime);
          const slotStartDate = new Date(targetDate);
          slotStartDate.setHours(
            Math.floor(currentMinutes / 60),
            currentMinutes % 60,
            0,
            0,
          );
          const slotEndDate = new Date(targetDate);
          slotEndDate.setHours(
            Math.floor((currentMinutes + schedule.slotDuration) / 60),
            (currentMinutes + schedule.slotDuration) % 60,
            0,
            0,
          );

          return slotStartDate < apptEnd && slotEndDate > apptStart;
        });

        // Check if slot is in the past (for today)
        const now = new Date();
        const slotDateTime = new Date(targetDate);
        slotDateTime.setHours(
          Math.floor(currentMinutes / 60),
          currentMinutes % 60,
          0,
          0,
        );
        const isPast = slotDateTime < now;

        slots.push({
          time: slotStart,
          endTime: slotEnd,
          doctorId: schedule.doctorId,
          doctorName: doctor.name,
          specialization: doctor.specialization || undefined,
          isAvailable: !isDuringTimeOff && !isBooked && !isPast,
        });

        currentMinutes += schedule.slotDuration;
      }
    }

    // Sort by time, then by doctor name
    slots.sort((a, b) => {
      const timeCompare = a.time.localeCompare(b.time);
      if (timeCompare !== 0) return timeCompare;
      return a.doctorName.localeCompare(b.doctorName);
    });

    return slots;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private validateTimeFormat(time: string) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new BadRequestException(
        `Invalid time format: ${time}. Use HH:MM format.`,
      );
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    return days[date.getDay()];
  }
}
