import {
  Inject,
  Injectable,
  ConflictException as _ConflictException,
  BadRequestException as _BadRequestException,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { getClinicLocalDayUtcBounds } from '@/shared/common/utils/clinic-calendar-bounds';
import {
  DEFAULT_TIMEZONE,
  fromLocalISOString,
  formatUtcInstantAsClinicPickerIso,
} from '@workspace/utils';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { AppointmentStatus } from '@workspace/db';
import { findFirstSchedulingConflict } from '@/domains/appointments/core/domain-services/appointment-interval-overlap';

interface AppointmentConflict {
  id: string;
  startTime: Date;
  endTime: Date;
}

interface AppointmentSchedulingRulesInterface {
  validateAppointmentTime(
    startTime: Date,
    endTime: Date,
  ): { valid: boolean; error?: string };

  validateAppointmentOverlap(
    doctorId: string,
    clinicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<{ hasConflict: boolean; conflict?: AppointmentConflict }>;

  validateDoctorTimeOff(
    doctorId: string,
    startTime: Date,
    endTime: Date,
    clinicId?: string,
  ): Promise<{ allowed: boolean; reason?: string }>;

  calculateAppointmentDuration(startTime: Date, endTime: Date): number;

  validateSlotAvailability(
    doctorId: string,
    clinicId: string,
    date: Date,
    slotType: 'morning' | 'afternoon' | 'evening',
  ): Promise<{ available: boolean; slots: number }>;

  canStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
  ): { allowed: boolean; reason?: string };

  validateConsultationPrerequisites(
    appointmentId: string,
  ): Promise<{ valid: boolean; missing: string[] }>;
}

@Injectable()
export class AppointmentSchedulingRulesService implements AppointmentSchedulingRulesInterface {
  private readonly MIN_APPOINTMENT_DURATION_MINUTES = 15;
  private readonly MAX_APPOINTMENT_DURATION_MINUTES = 480;
  private readonly APPOINTMENT_BUFFER_MINUTES = 5;
  private readonly BUSINESS_HOURS_START = 9;
  private readonly BUSINESS_HOURS_END = 18;

  constructor(
    @Inject(APPOINTMENT_PERSISTENCE_PORT)
    private prisma: AppointmentPersistencePort,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  validateAppointmentTime(
    startTime: Date,
    endTime: Date,
  ): { valid: boolean; error?: string } {
    if (endTime <= startTime) {
      return {
        valid: false,
        error: 'Appointment end time must be after start time',
      };
    }

    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    if (durationMinutes < this.MIN_APPOINTMENT_DURATION_MINUTES) {
      return {
        valid: false,
        error: `Appointment duration must be at least ${this.MIN_APPOINTMENT_DURATION_MINUTES} minutes`,
      };
    }

    if (durationMinutes > this.MAX_APPOINTMENT_DURATION_MINUTES) {
      return {
        valid: false,
        error: `Appointment duration cannot exceed ${this.MAX_APPOINTMENT_DURATION_MINUTES} minutes`,
      };
    }

    if (startTime < this.clock.now()) {
      return {
        valid: false,
        error: 'Appointment start time cannot be in the past',
      };
    }

    const startMinuteOfDay = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinuteOfDay = endTime.getHours() * 60 + endTime.getMinutes();
    const businessStartMinute = this.BUSINESS_HOURS_START * 60;
    const businessEndMinute = this.BUSINESS_HOURS_END * 60;
    if (
      startMinuteOfDay < businessStartMinute ||
      endMinuteOfDay > businessEndMinute
    ) {
      return {
        valid: false,
        error: 'Appointment is outside standard business hours (9 AM - 6 PM)',
      };
    }

    return { valid: true };
  }

  async validateAppointmentOverlap(
    doctorId: string,
    clinicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<{ hasConflict: boolean; conflict?: AppointmentConflict }> {
    // `take: 1` — the result is consumed by `findFirstSchedulingConflict`,
    // which only needs the first overlap. The where-clause is already
    // (doctorId, clinicId, time window, active status), so a single row is
    // both correct and the smallest possible read.
    const conflictingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        clinicId,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
            AppointmentStatus.RESCHEDULING,
          ],
        },
        ...(excludeAppointmentId ? { NOT: { id: excludeAppointmentId } } : {}),

        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
      take: 1,
    });

    const conflict = findFirstSchedulingConflict(
      startTime,
      endTime,
      conflictingAppointments,
      excludeAppointmentId,
    );

    if (conflict) {
      return { hasConflict: true, conflict };
    }

    return { hasConflict: false };
  }

  async validateDoctorTimeOff(
    doctorId: string,
    startTime: Date,
    endTime: Date,
    clinicId?: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // When a clinic context is supplied, scope to that clinic and clinic-agnostic
    // (global) time-offs, so a doctor's leave at another clinic doesn't block this one.
    const clinicScope = clinicId
      ? { OR: [{ clinicId }, { clinicId: null }] }
      : {};
    const timeOff = await this.prisma.doctorTimeOff.findFirst({
      where: {
        doctorId,
        ...clinicScope,
        AND: [{ startDate: { lt: endTime } }, { endDate: { gt: startTime } }],
      },
      select: {
        reason: true,
        startDate: true,
        endDate: true,
      },
    });

    if (timeOff) {
      return {
        allowed: false,
        reason: `Doctor has time off: ${timeOff.reason}`,
      };
    }

    return { allowed: true };
  }

  calculateAppointmentDuration(startTime: Date, endTime: Date): number {
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  async validateSlotAvailability(
    doctorId: string,
    clinicId: string,
    date: Date,
    slotType: 'morning' | 'afternoon' | 'evening',
  ): Promise<{ available: boolean; slots: number }> {
    const slotDefinitions = {
      morning: { start: 9, end: 12 },
      afternoon: { start: 12, end: 15 },
      evening: { start: 15, end: 18 },
    };

    const slot = slotDefinitions[slotType];
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { timezone: true },
    });
    const timezone = clinic?.timezone?.trim() || DEFAULT_TIMEZONE;
    const pickerDateStr = formatUtcInstantAsClinicPickerIso(date, timezone);
    const dayBounds = getClinicLocalDayUtcBounds(pickerDateStr, timezone);
    if (!dayBounds) {
      return { available: false, slots: 0 };
    }

    const slotStartTime = fromLocalISOString(
      `${pickerDateStr}T${String(slot.start).padStart(2, '0')}:00`,
      { timezone },
    );
    const slotEndTime = fromLocalISOString(
      `${pickerDateStr}T${String(slot.end).padStart(2, '0')}:00`,
      { timezone },
    );
    if (!slotStartTime || !slotEndTime) {
      return { available: false, slots: 0 };
    }

    const appointmentsInSlot = await this.prisma.appointment.count({
      where: {
        doctorId,
        clinicId,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        startTime: { lt: slotEndTime },
        endTime: { gt: slotStartTime },
      },
    });

    const maxSlotsPerPeriod = 4;
    const availableSlots = maxSlotsPerPeriod - appointmentsInSlot;

    return {
      available: availableSlots > 0,
      slots: Math.max(0, availableSlots),
    };
  }

  canStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
  ): { allowed: boolean; reason?: string } {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.RESCHEDULING,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.RESCHEDULING]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.SCHEDULED,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.IN_PROGRESS]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELLED]: [],
      [AppointmentStatus.NO_SHOW]: [
        AppointmentStatus.RESCHEDULING,
        AppointmentStatus.CANCELLED,
      ],
    };

    const allowed =
      validTransitions[currentStatus]?.includes(newStatus) ?? false;

    if (!allowed) {
      return {
        allowed: false,
        reason: `Cannot transition from ${currentStatus} to ${newStatus}`,
      };
    }

    return { allowed: true };
  }

  async validateConsultationPrerequisites(
    appointmentId: string,
  ): Promise<{ valid: boolean; missing: string[] }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: { dateOfBirth: true, phoneNumber: true, email: true },
        },
        vitalSign: true,
      },
    });

    if (!appointment) {
      return { valid: false, missing: ['Appointment not found'] };
    }

    const missing: string[] = [];

    if (!appointment.patient?.dateOfBirth) {
      missing.push('Patient date of birth');
    }

    if (!appointment.patient?.phoneNumber && !appointment.patient?.email) {
      missing.push('Patient contact information (phone or email)');
    }

    if (!appointment.vitalSign) {
      missing.push('Patient vital signs');
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      missing.push(
        `Appointment must be CONFIRMED (currently ${appointment.status})`,
      );
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
