import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { fromLocalISOString } from '@workspace/utils';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IDoctorScheduleRepository,
  DOCTOR_SCHEDULE_REPOSITORY_TOKEN,
} from '@/domains/doctors/core/repositories/doctor-schedule.repository.interface';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY_TOKEN,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import type { PublicBookingSlotListEmptyReason } from '@workspace/types';
import {
  type AvailableSlot,
  type DayOfWeek,
  normalizeCalendarDateInput,
  addOneCalendarDay,
  getDayOfWeekInClinicZone,
  implicitClinicWeeklyRowsForSlotFallback,
  generateSlotsForSchedule,
  sortSlots,
} from './slot-generation-helpers';

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
    const dateStr = normalizeCalendarDateInput(date);
    const dayOfWeek = getDayOfWeekInClinicZone(dateStr, timezone);

    const scheduleWhere: Prisma.DoctorScheduleWhereInput = {
      clinicId,
      dayOfWeek,
      isActive: true,
    };
    if (doctorId) scheduleWhere.doctorId = doctorId;

    let schedules =
      await this.scheduleRepository.findSchedulesForSlotGeneration(
        scheduleWhere,
      );

    if (schedules.length === 0 && doctorId) {
      const [clinicRowsInitial, doctorUser] = await Promise.all([
        this.scheduleRepository.findClinicWeeklyForSlotGeneration({
          clinicId,
          dayOfWeek,
        }),
        this.prisma.user.findFirst({
          where: { id: doctorId, clinicId },
          select: { name: true, specialization: true },
        }),
      ]);

      let clinicRows = clinicRowsInitial;
      if (
        clinicRows.length === 0 &&
        doctorUser &&
        !(await this.scheduleRepository.hasAnyClinicWeeklySchedule(clinicId))
      ) {
        clinicRows = implicitClinicWeeklyRowsForSlotFallback(
          clinicId,
          dayOfWeek as DayOfWeek,
        );
      }

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

    if (schedules.length === 0)
      return { slots: [], slotListEmptyReason: 'NO_WEEKLY_HOURS' };

    const doctorIds = [...new Set(schedules.map((s) => s.doctorId))];
    const rangeStart = fromLocalISOString(`${dateStr}T00:00`, { timezone });
    const rangeEndExclusive = fromLocalISOString(
      `${addOneCalendarDay(dateStr)}T00:00`,
      { timezone },
    );

    if (!rangeStart || !rangeEndExclusive)
      return { slots: [], slotListEmptyReason: 'DATE_PARSE_ERROR' };

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
      const doctorTimeOffs = timeOffs.filter(
        (t) => t.doctorId === schedule.doctorId,
      );
      const doctorAppointments = appointments.filter(
        (a) => a.doctorId === schedule.doctorId,
      );

      if (doctorTimeOffs.some((t) => t.isFullDay)) {
        fullDayOffScheduleCount += 1;
        continue;
      }

      slots.push(
        ...generateSlotsForSchedule(
          schedule,
          schedule.doctor,
          dateStr,
          timezone,
          doctorTimeOffs,
          doctorAppointments,
        ),
      );
    }

    const sorted = sortSlots(slots);
    if (sorted.length > 0) return { slots: sorted };
    if (fullDayOffScheduleCount >= schedules.length)
      return { slots: [], slotListEmptyReason: 'FULL_DAY_BLOCKED' };
    return { slots: [], slotListEmptyReason: 'NO_SLOTS_IN_RANGE' };
  }

  private async resolveClinicTimezone(clinicId: string): Promise<string> {
    const row = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const tz = row?.timezone?.trim();
    return tz || 'Asia/Kolkata';
  }
}
