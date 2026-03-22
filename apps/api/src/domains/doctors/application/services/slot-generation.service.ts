import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { TimeUtils } from '@/common/utils/time.utils';
import {
  IDoctorScheduleRepository,
  DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';

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

@Injectable()
export class SlotGenerationService {
  constructor(
    @Inject(DOCTOR_SCHEDULE_REPOSITORY_TOKEN)
    private scheduleRepository: IDoctorScheduleRepository,
    @Inject(APPOINTMENT_REPOSITORY_TOKEN)
    private appointmentRepository: IAppointmentRepository,
  ) {}

  async getAvailableSlots(
    clinicId: string,
    date: Date | string,
    doctorId?: string,
  ): Promise<AvailableSlot[]> {
    const targetDate = new Date(date);
    const dayOfWeek = this.getDayOfWeek(targetDate);

    const scheduleWhere: Prisma.DoctorScheduleWhereInput = {
      clinicId,
      dayOfWeek,
      isActive: true,
    };
    if (doctorId) {
      scheduleWhere.doctorId = doctorId;
    }

    const schedules =
      await this.scheduleRepository.findSchedulesForSlotGeneration(
        scheduleWhere,
      );

    if (schedules.length === 0) {
      return [];
    }

    const doctorIds = [...new Set(schedules.map((s) => s.doctorId))];

    const { startOfDay, endOfDay } = this.getDayBoundaries(targetDate);

    const [timeOffs, appointments] = await Promise.all([
      this.scheduleRepository.findTimeOffsForSlots({
        doctorId: { in: doctorIds },
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        OR: [{ clinicId }, { clinicId: null }],
      }),
      this.appointmentRepository.findAppointmentsForSlots(
        clinicId,
        doctorIds,
        startOfDay,
        endOfDay,
      ),
    ]);

    const slots: AvailableSlot[] = [];

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
        continue;
      }

      const scheduleSlots = this.generateSlotsForSchedule(
        schedule,
        doctor,
        targetDate,
        doctorTimeOffs,
        doctorAppointments,
      );

      slots.push(...scheduleSlots);
    }

    return this.sortSlots(slots);
  }

  private generateSlotsForSchedule(
    schedule: {
      doctorId: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
    },
    doctor: { name: string; specialization: string | null },
    targetDate: Date,
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
        targetDate,
        appointments,
      );
      const isPast = this.isSlotInPast(currentMinutes, targetDate);

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
    targetDate: Date,
    appointments: Array<{ startTime: Date; endTime: Date }>,
  ): boolean {
    const slotStartDate = new Date(targetDate);
    slotStartDate.setHours(
      Math.floor(currentMinutes / 60),
      currentMinutes % 60,
      0,
      0,
    );
    const slotEndDate = new Date(targetDate);
    slotEndDate.setHours(
      Math.floor((currentMinutes + slotDuration) / 60),
      (currentMinutes + slotDuration) % 60,
      0,
      0,
    );

    return appointments.some((a) => {
      const apptStart = new Date(a.startTime);
      const apptEnd = new Date(a.endTime);
      return slotStartDate < apptEnd && slotEndDate > apptStart;
    });
  }

  private isSlotInPast(currentMinutes: number, targetDate: Date): boolean {
    const now = new Date();
    const slotDateTime = new Date(targetDate);
    slotDateTime.setHours(
      Math.floor(currentMinutes / 60),
      currentMinutes % 60,
      0,
      0,
    );
    return slotDateTime < now;
  }

  private getDayBoundaries(date: Date): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
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

  private sortSlots(slots: AvailableSlot[]): AvailableSlot[] {
    return slots.sort((a, b) => {
      const timeCompare = a.time.localeCompare(b.time);
      if (timeCompare !== 0) return timeCompare;
      return a.doctorName.localeCompare(b.doctorName);
    });
  }
}
