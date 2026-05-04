import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { fromLocalISOString } from '@workspace/utils';
import { PrismaService } from '@/prisma/prisma.service';
import { TimeUtils } from '@/common/utils/time.utils';
import {
  IDoctorScheduleRepository,
  DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type { PublicBookingSlotListEmptyReason } from '@workspace/types';

type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

interface AvailableSlot {
  time: string;
  endTime: string;
  doctorId: string;
  doctorName: string;
  specialization?: string;
  isAvailable: boolean;
}

interface AvailableSlotsWithMeta {
  slots: AvailableSlot[];
  /** When `slots` is empty, why the list is empty (for patient-facing copy). */
  slotListEmptyReason?: PublicBookingSlotListEmptyReason;
}

@Injectable()
export class SlotGenerationService {
  constructor(
    @Inject(DOCTOR_SCHEDULE_REPOSITORY_TOKEN)
    private scheduleRepository: IDoctorScheduleRepository,
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private appointmentRepository: IAppointmentRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getAvailableSlots(
    clinicId: string,
    date: Date | string,
    doctorId?: string,
  ): Promise<AvailableSlot[]> {
    const { slots } = await this.getAvailableSlotsWithMeta(
      clinicId,
      date,
      doctorId,
    );
    return slots;
  }

  /**
   * Same slot list as {@link getAvailableSlots}, plus an optional reason when
   * the list is empty (public booking UX).
   */
  async getAvailableSlotsWithMeta(
    clinicId: string,
    date: Date | string,
    doctorId?: string,
  ): Promise<AvailableSlotsWithMeta> {
    const timezone = await this.resolveClinicTimezone(clinicId);
    const dateStr = this.normalizeCalendarDateInput(date);
    const dayOfWeek = this.getDayOfWeekInClinicZone(dateStr, timezone);

    const scheduleWhere: Prisma.DoctorScheduleWhereInput = {
      clinicId,
      dayOfWeek,
      isActive: true,
    };
    if (doctorId) {
      scheduleWhere.doctorId = doctorId;
    }

    let schedules =
      await this.scheduleRepository.findSchedulesForSlotGeneration(
        scheduleWhere,
      );

    if (schedules.length === 0 && doctorId) {
      const [clinicRows, doctorUser] = await Promise.all([
        this.scheduleRepository.findClinicWeeklyForSlotGeneration({
          clinicId,
          dayOfWeek,
        }),
        this.prisma.user.findFirst({
          where: { id: doctorId, clinicId },
          select: { name: true, specialization: true },
        }),
      ]);
      if (clinicRows.length > 0 && doctorUser) {
        const synthetic = clinicRows.map((row) => ({
          id: row.id,
          doctorId,
          clinicId: row.clinicId,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          slotDuration: row.slotDuration,
          isActive: row.isActive,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          doctor: {
            id: doctorId,
            name: doctorUser.name,
            specialization: doctorUser.specialization
              ? String(doctorUser.specialization)
              : null,
          },
        }));
        schedules = synthetic as typeof schedules;
      }
    }

    if (schedules.length === 0) {
      return { slots: [], slotListEmptyReason: 'NO_WEEKLY_HOURS' };
    }

    const doctorIds = [...new Set(schedules.map((s) => s.doctorId))];

    const rangeStart = fromLocalISOString(`${dateStr}T00:00`, { timezone });
    const rangeEndExclusive = fromLocalISOString(
      `${this.addOneCalendarDay(dateStr)}T00:00`,
      { timezone },
    );

    if (!rangeStart || !rangeEndExclusive) {
      return { slots: [], slotListEmptyReason: 'DATE_PARSE_ERROR' };
    }

    const [timeOffs, appointments] = await Promise.all([
      this.scheduleRepository.findTimeOffsForSlots({
        doctorId: { in: doctorIds },
        startDate: { lt: rangeEndExclusive },
        endDate: { gt: rangeStart },
        OR: [{ clinicId }, { clinicId: null }],
      }),
      this.appointmentRepository.findAppointmentsForSlots(
        clinicId,
        doctorIds,
        rangeStart,
        rangeEndExclusive,
      ),
    ]);

    const slots: AvailableSlot[] = [];
    let fullDayOffScheduleCount = 0;

    for (const schedule of schedules) {
      const doctor = schedule.doctor;
      const doctorTimeOffs = timeOffs.filter(
        (t) => t.doctorId === schedule.doctorId,
      );
      const doctorAppointments = appointments.filter(
        (a) => a.doctorId === schedule.doctorId,
      );

      const hasFullDayOff = doctorTimeOffs.some((t) => t.isFullDay);
      if (hasFullDayOff) {
        fullDayOffScheduleCount += 1;
        continue;
      }

      const scheduleSlots = this.generateSlotsForSchedule(
        schedule,
        doctor,
        dateStr,
        timezone,
        doctorTimeOffs,
        doctorAppointments,
      );

      slots.push(...scheduleSlots);
    }

    const sorted = this.sortSlots(slots);
    if (sorted.length > 0) {
      return { slots: sorted };
    }

    if (fullDayOffScheduleCount >= schedules.length) {
      return { slots: [], slotListEmptyReason: 'FULL_DAY_BLOCKED' };
    }

    return { slots: [], slotListEmptyReason: 'NO_SLOTS_IN_RANGE' };
  }

  private async resolveClinicTimezone(clinicId: string): Promise<string> {
    const row = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const tz = row?.timezone?.trim();
    if (!tz) {
      return 'Asia/Kolkata';
    }
    return tz;
  }

  private normalizeCalendarDateInput(date: Date | string): string {
    if (typeof date === 'string') {
      const t = date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        return t;
      }
      const parsed = new Date(t);
      if (Number.isNaN(parsed.getTime())) {
        const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
        return m?.[1] ?? '1970-01-01';
      }
      return parsed.toISOString().slice(0, 10);
    }
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return '1970-01-01';
    }
    return date.toISOString().slice(0, 10);
  }

  private addOneCalendarDay(dateStr: string): string {
    const parts = dateStr.split('-').map((x) => parseInt(x, 10));
    const y = parts[0] ?? 1970;
    const m = parts[1] ?? 1;
    const d = parts[2] ?? 1;
    const next = new Date(Date.UTC(y, m - 1, d));
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  }

  private getDayOfWeekInClinicZone(
    dateStr: string,
    timezone: string,
  ): DayOfWeek {
    const anchor = fromLocalISOString(`${dateStr}T12:00`, { timezone });
    if (!anchor) {
      return 'MONDAY';
    }
    const long = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: timezone,
    }).format(anchor);
    const map: Record<string, DayOfWeek> = {
      Sunday: 'SUNDAY',
      Monday: 'MONDAY',
      Tuesday: 'TUESDAY',
      Wednesday: 'WEDNESDAY',
      Thursday: 'THURSDAY',
      Friday: 'FRIDAY',
      Saturday: 'SATURDAY',
    };
    return map[long] ?? 'MONDAY';
  }

  private generateSlotsForSchedule(
    schedule: {
      doctorId: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
    },
    doctor: { name: string; specialization: string | null },
    dateStr: string,
    timezone: string,
    timeOffs: Array<{
      isFullDay: boolean;
      startTime: string | null;
      endTime: string | null;
    }>,
    appointments: Array<{ startTime: Date; endTime: Date }>,
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    let currentMinutes = TimeUtils.timeToMinutes(schedule.startTime);
    const endMinutes = TimeUtils.timeToMinutes(schedule.endTime);

    while (currentMinutes + schedule.slotDuration <= endMinutes) {
      const slotStart = TimeUtils.minutesToTime(currentMinutes);
      const slotEnd = TimeUtils.minutesToTime(
        currentMinutes + schedule.slotDuration,
      );

      const isDuringTimeOff = this.isSlotDuringTimeOff(
        currentMinutes,
        timeOffs,
      );
      const isBooked = this.isSlotBooked(
        currentMinutes,
        schedule.slotDuration,
        dateStr,
        timezone,
        appointments,
      );
      const isPast = this.isSlotInPast(currentMinutes, dateStr, timezone);

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

    return slots;
  }

  private isSlotDuringTimeOff(
    currentMinutes: number,
    timeOffs: Array<{
      isFullDay: boolean;
      startTime: string | null;
      endTime: string | null;
    }>,
  ): boolean {
    return timeOffs.some((t) => {
      if (t.isFullDay) return true;
      if (!t.startTime || !t.endTime) return false;
      const offStart = TimeUtils.timeToMinutes(t.startTime);
      const offEnd = TimeUtils.timeToMinutes(t.endTime);
      return currentMinutes >= offStart && currentMinutes < offEnd;
    });
  }

  private isSlotBooked(
    currentMinutes: number,
    slotDuration: number,
    dateStr: string,
    timezone: string,
    appointments: Array<{ startTime: Date; endTime: Date }>,
  ): boolean {
    const slotStartLabel = TimeUtils.minutesToTime(currentMinutes);
    const slotEndLabel = TimeUtils.minutesToTime(currentMinutes + slotDuration);
    const slotStart = fromLocalISOString(`${dateStr}T${slotStartLabel}`, {
      timezone,
    });
    const slotEnd = fromLocalISOString(`${dateStr}T${slotEndLabel}`, {
      timezone,
    });
    if (!slotStart || !slotEnd) {
      return false;
    }

    return appointments.some((a) => {
      const apptStart = new Date(a.startTime);
      const apptEnd = new Date(a.endTime);
      return slotStart < apptEnd && slotEnd > apptStart;
    });
  }

  private isSlotInPast(
    currentMinutes: number,
    dateStr: string,
    timezone: string,
  ): boolean {
    const slotStartLabel = TimeUtils.minutesToTime(currentMinutes);
    const slotInstant = fromLocalISOString(`${dateStr}T${slotStartLabel}`, {
      timezone,
    });
    if (!slotInstant) {
      return false;
    }
    return slotInstant.getTime() < Date.now();
  }

  private sortSlots(slots: AvailableSlot[]): AvailableSlot[] {
    return slots.sort((a, b) => {
      const timeCompare = a.time.localeCompare(b.time);
      if (timeCompare !== 0) return timeCompare;
      return a.doctorName.localeCompare(b.doctorName);
    });
  }
}
