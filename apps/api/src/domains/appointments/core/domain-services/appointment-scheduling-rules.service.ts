import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentStatus } from '@workspace/db';

export interface AppointmentConflict {
  id: string;
  startTime: Date;
  endTime: Date;
}

export interface AppointmentSchedulingRulesInterface {
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

  constructor(private prisma: PrismaService) {}

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

    if (startTime < new Date()) {
      return {
        valid: false,
        error: 'Appointment start time cannot be in the past',
      };
    }

    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    if (
      startHour < this.BUSINESS_HOURS_START ||
      endHour > this.BUSINESS_HOURS_END
    ) {
      return {
        valid: true,
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
    const conflictingAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        clinicId,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.IN_PROGRESS,
          ],
        },
        NOT: {
          id: excludeAppointmentId,
        },

        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
      },
    });

    if (conflictingAppointments.length > 0) {
      return {
        hasConflict: true,
        conflict: conflictingAppointments[0],
      };
    }

    return { hasConflict: false };
  }

  async validateDoctorTimeOff(
    doctorId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const timeOff = await this.prisma.doctorTimeOff.findMany({
      where: {
        doctorId,
        AND: [
          { startTime: { lt: endTime.toISOString() } },
          { endTime: { gt: startTime.toISOString() } },
        ],
      },
      select: {
        reason: true,
        startTime: true,
        endTime: true,
      },
    });

    if (timeOff.length > 0) {
      return {
        allowed: false,
        reason: `Doctor has time off: ${timeOff[0].reason}`,
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
    const slotStartTime = new Date(date);
    slotStartTime.setHours(slot.start, 0, 0, 0);
    const slotEndTime = new Date(date);
    slotEndTime.setHours(slot.end, 0, 0, 0);

    const appointmentsInSlot = await this.prisma.appointment.count({
      where: {
        doctorId,
        clinicId,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
        startTime: { gte: slotStartTime },
        endTime: { lte: slotEndTime },
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
