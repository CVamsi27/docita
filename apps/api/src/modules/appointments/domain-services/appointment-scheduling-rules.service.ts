import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppointmentStatus } from '@workspace/db';

/**
 * Appointment Scheduling Rules Domain Service
 * Encapsulates pure business logic for appointment scheduling
 * No database mutations - used by AppointmentsService for validation
 */
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
  ): Promise<{ hasConflict: boolean; conflict?: any }>;

  validateDoctorTimeOff(
    doctorId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ allowed: boolean; reason?: string }>;

  calculateAppointmentDuration(
    startTime: Date,
    endTime: Date,
  ): number;

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
  // Business rule constants
  private readonly MIN_APPOINTMENT_DURATION_MINUTES = 15;
  private readonly MAX_APPOINTMENT_DURATION_MINUTES = 480; // 8 hours
  private readonly APPOINTMENT_BUFFER_MINUTES = 5; // 5-minute buffer between appointments
  private readonly BUSINESS_HOURS_START = 9; // 9 AM
  private readonly BUSINESS_HOURS_END = 18; // 6 PM

  constructor(private prisma: PrismaService) {}

  /**
   * Validate appointment time is reasonable
   */
  validateAppointmentTime(
    startTime: Date,
    endTime: Date,
  ): { valid: boolean; error?: string } {
    // End time must be after start time
    if (endTime <= startTime) {
      return {
        valid: false,
        error: 'Appointment end time must be after start time',
      };
    }

    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);

    // Check minimum duration
    if (durationMinutes < this.MIN_APPOINTMENT_DURATION_MINUTES) {
      return {
        valid: false,
        error: `Appointment duration must be at least ${this.MIN_APPOINTMENT_DURATION_MINUTES} minutes`,
      };
    }

    // Check maximum duration
    if (durationMinutes > this.MAX_APPOINTMENT_DURATION_MINUTES) {
      return {
        valid: false,
        error: `Appointment duration cannot exceed ${this.MAX_APPOINTMENT_DURATION_MINUTES} minutes`,
      };
    }

    // Check appointment is not in the past
    if (startTime < new Date()) {
      return {
        valid: false,
        error: 'Appointment start time cannot be in the past',
      };
    }

    // Check business hours (basic check - can be overridden per clinic)
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    if (
      startHour < this.BUSINESS_HOURS_START ||
      endHour > this.BUSINESS_HOURS_END
    ) {
      // This is a warning, not a blocker - some clinics may have extended hours
      return {
        valid: true,
        error: 'Appointment is outside standard business hours (9 AM - 6 PM)',
      };
    }

    return { valid: true };
  }

  /**
   * Check for appointment overlap with doctor's existing appointments
   */
  async validateAppointmentOverlap(
    doctorId: string,
    clinicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
  ): Promise<{ hasConflict: boolean; conflict?: any }> {
    const conflictingAppointments =
      await this.prisma.appointment.findMany({
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
          // Check for time overlap: existing.start < new.end AND existing.end > new.start
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          patient: { select: { name: true } },
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

  /**
   * Check if doctor has time off during the appointment time
   */
  async validateDoctorTimeOff(
    doctorId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const timeOff = await this.prisma.doctorTimeOff.findMany({
      where: {
        doctorId,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
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

  /**
   * Calculate appointment duration in minutes
   */
  calculateAppointmentDuration(startTime: Date, endTime: Date): number {
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  /**
   * Check slot availability for a doctor on a given date/time
   */
  async validateSlotAvailability(
    doctorId: string,
    clinicId: string,
    date: Date,
    slotType: 'morning' | 'afternoon' | 'evening',
  ): Promise<{ available: boolean; slots: number }> {
    // Define slot hours
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

    // Count appointments in the slot
    const appointmentsInSlot = await this.prisma.appointment.count({
      where: {
        doctorId,
        clinicId,
        status: {
          in: [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
          ],
        },
        startTime: { gte: slotStartTime },
        endTime: { lte: slotEndTime },
      },
    });

    // Max 4 appointments per 3-hour slot (45 min per appointment)
    const maxSlotsPerPeriod = 4;
    const availableSlots = maxSlotsPerPeriod - appointmentsInSlot;

    return {
      available: availableSlots > 0,
      slots: Math.max(0, availableSlots),
    };
  }

  /**
   * Validate status transition is allowed
   */
  canStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
  ): { allowed: boolean; reason?: string } {
    // Define valid transitions
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
      [AppointmentStatus.COMPLETED]: [AppointmentStatus.COMPLETED], // Terminal state
      [AppointmentStatus.CANCELLED]: [AppointmentStatus.CANCELLED], // Terminal state
      [AppointmentStatus.NO_SHOW]: [AppointmentStatus.RESCHEDULED],
      [AppointmentStatus.RESCHEDULED]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ],
    };

    const allowed = validTransitions[currentStatus]?.includes(newStatus) ?? false;

    if (!allowed) {
      return {
        allowed: false,
        reason: `Cannot transition from ${currentStatus} to ${newStatus}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Validate all prerequisites for starting a consultation
   */
  async validateConsultationPrerequisites(
    appointmentId: string,
  ): Promise<{ valid: boolean; missing: string[] }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { dateOfBirth: true, contactInfo: true } },
        vitalSign: true,
      },
    });

    if (!appointment) {
      return { valid: false, missing: ['Appointment not found'] };
    }

    const missing: string[] = [];

    // Check patient info completeness
    if (!appointment.patient?.dateOfBirth) {
      missing.push('Patient date of birth');
    }

    if (!appointment.patient?.contactInfo) {
      missing.push('Patient contact info');
    }

    // Check vitals are recorded
    if (!appointment.vitalSign || appointment.vitalSign.length === 0) {
      missing.push('Patient vital signs');
    }

    // Check appointment is confirmed
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
